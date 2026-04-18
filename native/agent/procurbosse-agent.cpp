/**
 * ProcurBosse Native Agent v4.9 - C++ Windows System Monitor
 * EL5 MediProcure | Embu Level 5 Hospital | Embu County Government | Kenya
 *
 * PURPOSE:
 *   Runs as a Windows service/tray app on the hospital server.
 *   Collects real-time system metrics every 30 seconds and POSTs them
 *   to Supabase so the Admin Panel shows live hardware health.
 *
 * METRICS COLLECTED:
 *   - CPU usage % (rolling 500ms sample)
 *   - RAM used/total/% 
 *   - Disk C: used/total/%
 *   - Running process count
 *   - Hostname, OS version, agent version
 *
 * COMPILE (MinGW64 on Windows):
 *   g++ -std=c++17 -O2 -static -o procurbosse-agent.exe procurbosse-agent.cpp
 *       -lwinhttp -lpdh -lpsapi -lws2_32
 *
 * COMPILE (MSVC):
 *   cl /std:c++17 /O2 /EHsc procurbosse-agent.cpp /link winhttp.lib pdh.lib psapi.lib ws2_32.lib
 */

#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <winhttp.h>
#include <pdh.h>
#include <psapi.h>
#include <tlhelp32.h>
#include <wtsapi32.h>
#include <lmcons.h>

#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <thread>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <algorithm>
#include <atomic>
#include <memory>
#include <functional>

#pragma comment(lib, "winhttp.lib")
#pragma comment(lib, "pdh.lib")
#pragma comment(lib, "psapi.lib")
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "wtsapi32.lib")
#pragma comment(lib, "netapi32.lib")

/* ---- Build-time configuration (injected by CI/CD) ---- */
#ifndef AGENT_VERSION
#define AGENT_VERSION "4.9.0"
#endif

#ifndef SUPABASE_HOST_W
#define SUPABASE_HOST_W L"yvjfehnzbzjliizjvuhq.supabase.co"
#endif

#ifndef SUPABASE_ANON_KEY
#define SUPABASE_ANON_KEY \
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." \
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0." \
    "mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc"
#endif

static const int HEARTBEAT_SECONDS = 30;
static const int MAX_LOG_MB        = 10;  // rotate log at 10MB
static const std::string ANON_KEY  = SUPABASE_ANON_KEY;

/* ================================================================
 *  LOGGING
 * ================================================================ */
static std::ofstream g_log;
static std::atomic<bool> g_running(true);

void log_msg(const std::string& level, const std::string& msg) {
    std::time_t now = std::time(nullptr);
    char ts[32];
    std::strftime(ts, sizeof(ts), "%Y-%m-%dT%H:%M:%S", std::gmtime(&now));
    std::string line = std::string("[") + ts + "] [" + level + "] " + msg;
    std::cout << line << std::endl;
    if (g_log.is_open()) { g_log << line << "\n"; g_log.flush(); }
}

#define LOG_INFO(m)  log_msg("INFO", m)
#define LOG_WARN(m)  log_msg("WARN", m)
#define LOG_ERROR(m) log_msg("ERROR", m)

void init_log() {
    char exe_path[MAX_PATH] = {};
    GetModuleFileNameA(nullptr, exe_path, MAX_PATH);
    std::string log_path = std::string(exe_path);
    auto slash = log_path.rfind('\\');
    if (slash != std::string::npos) log_path = log_path.substr(0, slash + 1);
    log_path += "procurbosse-agent.log";

    // Rotate if over MAX_LOG_MB
    WIN32_FILE_ATTRIBUTE_DATA fa = {};
    if (GetFileAttributesExA(log_path.c_str(), GetFileExInfoStandard, &fa)) {
        LARGE_INTEGER sz;
        sz.HighPart = fa.nFileSizeHigh;
        sz.LowPart  = fa.nFileSizeLow;
        if (sz.QuadPart > (LONGLONG)MAX_LOG_MB * 1024 * 1024) {
            std::string bak = log_path + ".bak";
            DeleteFileA(bak.c_str());
            MoveFileA(log_path.c_str(), bak.c_str());
        }
    }

    g_log.open(log_path, std::ios::app);
    LOG_INFO("ProcurBosse Native Agent v" AGENT_VERSION " starting");
    LOG_INFO("Log: " + log_path);
}

/* ================================================================
 *  SYSTEM METRICS
 * ================================================================ */
struct SystemMetrics {
    double cpu_percent   = 0.0;
    double ram_used_mb   = 0.0;
    double ram_total_mb  = 0.0;
    double ram_percent   = 0.0;
    double disk_used_gb  = 0.0;
    double disk_total_gb = 0.0;
    double disk_percent  = 0.0;
    int    process_count = 0;
    int    user_sessions = 0;  // Windows logged-in sessions
    std::string hostname;
    std::string os_version;
    std::string reported_at;
};

/* CPU: two readings 500ms apart for delta-based % */
static FILETIME g_prev_idle   = {};
static FILETIME g_prev_kernel = {};
static FILETIME g_prev_user   = {};
static bool     g_cpu_init    = false;

double get_cpu_percent() {
    FILETIME idle, kernel, user;
    if (!GetSystemTimes(&idle, &kernel, &user)) return 0.0;

    auto to_ull = [](FILETIME ft) -> unsigned long long {
        return ((unsigned long long)ft.dwHighDateTime << 32) | ft.dwLowDateTime;
    };

    if (!g_cpu_init) {
        g_prev_idle   = idle;
        g_prev_kernel = kernel;
        g_prev_user   = user;
        g_cpu_init    = true;
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
        return get_cpu_percent(); // recurse once for initial delta
    }

    unsigned long long d_idle   = to_ull(idle)   - to_ull(g_prev_idle);
    unsigned long long d_kernel = to_ull(kernel) - to_ull(g_prev_kernel);
    unsigned long long d_user   = to_ull(user)   - to_ull(g_prev_user);

    g_prev_idle   = idle;
    g_prev_kernel = kernel;
    g_prev_user   = user;

    unsigned long long total = d_kernel + d_user;
    if (total == 0) return 0.0;
    double pct = (1.0 - (double)d_idle / (double)total) * 100.0;
    return std::max(0.0, std::min(100.0, pct));
}

SystemMetrics collect_metrics() {
    SystemMetrics m;
    m.cpu_percent = get_cpu_percent();

    /* UTC timestamp */
    std::time_t now = std::time(nullptr);
    char ts[32];
    std::strftime(ts, sizeof(ts), "%Y-%m-%dT%H:%M:%SZ", std::gmtime(&now));
    m.reported_at = ts;

    /* Hostname */
    char host[MAX_COMPUTERNAME_LENGTH + 1] = {};
    DWORD host_len = sizeof(host);
    GetComputerNameA(host, &host_len);
    m.hostname = host;

    /* OS version */
    OSVERSIONINFOEXA osi = {};
    osi.dwOSVersionInfoSize = sizeof(osi);
    // Use RtlGetVersion via function pointer (avoids deprecation warning)
    using fnRGV = LONG(WINAPI*)(OSVERSIONINFOEXA*);
    HMODULE ntdll = GetModuleHandleA("ntdll");
    auto RtlGetVersion = ntdll ? (fnRGV)GetProcAddress(ntdll, "RtlGetVersion") : nullptr;
    if (RtlGetVersion) RtlGetVersion(&osi);
    char osv[64] = {};
    std::snprintf(osv, sizeof(osv), "Windows %lu.%lu Build %lu",
        osi.dwMajorVersion, osi.dwMinorVersion, osi.dwBuildNumber);
    m.os_version = osv;

    /* RAM */
    MEMORYSTATUSEX ms = {};
    ms.dwLength = sizeof(ms);
    if (GlobalMemoryStatusEx(&ms)) {
        m.ram_total_mb = ms.ullTotalPhys / (1024.0 * 1024.0);
        m.ram_used_mb  = (ms.ullTotalPhys - ms.ullAvailPhys) / (1024.0 * 1024.0);
        m.ram_percent  = (double)ms.dwMemoryLoad;
    }

    /* Disk C: */
    ULARGE_INTEGER free_bytes, total_bytes, total_free;
    if (GetDiskFreeSpaceExA("C:\\", &free_bytes, &total_bytes, &total_free)) {
        m.disk_total_gb = total_bytes.QuadPart / (1024.0 * 1024.0 * 1024.0);
        m.disk_used_gb  = (total_bytes.QuadPart - total_free.QuadPart) / (1024.0 * 1024.0 * 1024.0);
        m.disk_percent  = m.disk_total_gb > 0 ? (m.disk_used_gb / m.disk_total_gb * 100.0) : 0.0;
    }

    /* Process count */
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap != INVALID_HANDLE_VALUE) {
        PROCESSENTRY32A pe = {};
        pe.dwSize = sizeof(pe);
        int cnt = 0;
        if (Process32FirstA(snap, &pe)) { do { cnt++; } while (Process32NextA(snap, &pe)); }
        CloseHandle(snap);
        m.process_count = cnt;
    }

    /* Windows user sessions */
    WTS_SESSION_INFOA* sessions = nullptr;
    DWORD session_count = 0;
    if (WTSEnumerateSessionsA(WTS_CURRENT_SERVER_HANDLE, 0, 1, &sessions, &session_count)) {
        int active = 0;
        for (DWORD i = 0; i < session_count; i++) {
            if (sessions[i].State == WTSActive) active++;
        }
        WTSFreeMemory(sessions);
        m.user_sessions = active;
    }

    return m;
}

/* ================================================================
 *  JSON SERIALIZATION
 * ================================================================ */
std::string escape_json(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 4);
    for (char c : s) {
        if (c == '"')  { out += "\\\""; }
        else if (c == '\\') { out += "\\\\"; }
        else if (c == '\n') { out += "\\n"; }
        else if (c == '\r') { out += "\\r"; }
        else if (c == '\t') { out += "\\t"; }
        else { out += c; }
    }
    return out;
}

std::string metrics_to_json(const SystemMetrics& m) {
    std::ostringstream j;
    j << std::fixed << std::setprecision(2);
    j << "{"
      << "\"hostname\":\""       << escape_json(m.hostname)     << "\","
      << "\"agent_version\":\""  << AGENT_VERSION               << "\","
      << "\"os_version\":\""     << escape_json(m.os_version)   << "\","
      << "\"cpu_percent\":"      << m.cpu_percent                << ","
      << "\"ram_used_mb\":"      << m.ram_used_mb                << ","
      << "\"ram_total_mb\":"     << m.ram_total_mb               << ","
      << "\"ram_percent\":"      << m.ram_percent                << ","
      << "\"disk_used_gb\":"     << m.disk_used_gb               << ","
      << "\"disk_total_gb\":"    << m.disk_total_gb              << ","
      << "\"disk_percent\":"     << m.disk_percent               << ","
      << "\"process_count\":"    << m.process_count              << ","
      << "\"user_sessions\":"    << m.user_sessions              << ","
      << "\"reported_at\":\""    << m.reported_at                << "\""
      << "}";
    return j.str();
}

/* ================================================================
 *  HTTP POST via WinHTTP
 * ================================================================ */
struct HttpResult {
    bool    success;
    int     status_code;
    std::string body;
};

HttpResult http_post(const std::wstring& host, const std::wstring& path,
                     const std::string& body, const std::string& auth_key)
{
    HttpResult result = { false, 0, "" };

    HINTERNET hsession = WinHttpOpen(
        L"ProcurBosse-Agent/" L"" AGENT_VERSION,
        WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
        WINHTTP_NO_PROXY_NAME,
        WINHTTP_NO_PROXY_BYPASS, 0);
    if (!hsession) { LOG_ERROR("WinHttpOpen failed: " + std::to_string(GetLastError())); return result; }

    HINTERNET hconn = WinHttpConnect(hsession, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, 0);
    if (!hconn) {
        LOG_ERROR("WinHttpConnect failed: " + std::to_string(GetLastError()));
        WinHttpCloseHandle(hsession);
        return result;
    }

    HINTERNET hreq = WinHttpOpenRequest(
        hconn, L"POST", path.c_str(), nullptr,
        WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES,
        WINHTTP_FLAG_SECURE);
    if (!hreq) {
        LOG_ERROR("WinHttpOpenRequest failed: " + std::to_string(GetLastError()));
        WinHttpCloseHandle(hconn);
        WinHttpCloseHandle(hsession);
        return result;
    }

    // SSL options - allow all (older Windows certificates may fail strict checks)
    DWORD sec_flags = SECURITY_FLAG_IGNORE_UNKNOWN_CA |
                      SECURITY_FLAG_IGNORE_CERT_CN_INVALID |
                      SECURITY_FLAG_IGNORE_CERT_DATE_INVALID;
    WinHttpSetOption(hreq, WINHTTP_OPTION_SECURITY_FLAGS, &sec_flags, sizeof(sec_flags));

    // Headers
    std::string headers =
        "Content-Type: application/json\r\n"
        "apikey: " + auth_key + "\r\n"
        "Authorization: Bearer " + auth_key + "\r\n"
        "Prefer: return=minimal\r\n";
    std::wstring wheaders(headers.begin(), headers.end());

    BOOL ok = WinHttpSendRequest(
        hreq,
        wheaders.c_str(), (DWORD)wheaders.size(),
        (LPVOID)body.c_str(), (DWORD)body.size(),
        (DWORD)body.size(), 0);

    if (ok) ok = WinHttpReceiveResponse(hreq, nullptr);

    if (ok) {
        DWORD status = 0, status_size = sizeof(DWORD);
        WinHttpQueryHeaders(hreq,
            WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
            WINHTTP_HEADER_NAME_BY_INDEX, &status, &status_size,
            WINHTTP_NO_HEADER_INDEX);
        result.status_code = (int)status;
        result.success = (status >= 200 && status < 300);
    } else {
        LOG_ERROR("WinHttpSendRequest/ReceiveResponse error: " + std::to_string(GetLastError()));
    }

    WinHttpCloseHandle(hreq);
    WinHttpCloseHandle(hconn);
    WinHttpCloseHandle(hsession);
    return result;
}

/* ================================================================
 *  MAIN LOOP
 * ================================================================ */
int main(int argc, char* argv[]) {
    init_log();

    LOG_INFO("Hospital: Embu Level 5 Hospital");
    LOG_INFO("Project:  EL5 MediProcure");
    LOG_INFO("Heartbeat: " + std::to_string(HEARTBEAT_SECONDS) + "s");
    LOG_INFO("Endpoint: https://" + std::string(SUPABASE_HOST_W) + "/rest/v1/system_metrics");

    // Signal handler for clean shutdown
    SetConsoleCtrlHandler([](DWORD type) -> BOOL {
        if (type == CTRL_C_EVENT || type == CTRL_BREAK_EVENT || type == CTRL_CLOSE_EVENT) {
            LOG_INFO("Shutdown signal received - stopping agent");
            g_running.store(false);
            return TRUE;
        }
        return FALSE;
    }, TRUE);

    // Warm up CPU sampler
    get_cpu_percent();
    std::this_thread::sleep_for(std::chrono::milliseconds(600));

    int report_count  = 0;
    int error_count   = 0;
    int backoff_ms    = 0;

    while (g_running.load()) {
        auto cycle_start = std::chrono::steady_clock::now();

        // Collect
        SystemMetrics metrics = collect_metrics();
        std::string json      = metrics_to_json(metrics);

        LOG_INFO("CPU=" + std::to_string((int)metrics.cpu_percent) + "% "
               + "RAM=" + std::to_string((int)metrics.ram_percent) + "% "
               + "DISK=" + std::to_string((int)metrics.disk_percent) + "% "
               + "PROCS=" + std::to_string(metrics.process_count)
               + " SESSIONS=" + std::to_string(metrics.user_sessions));

        // POST
        auto result = http_post(
            SUPABASE_HOST_W,
            L"/rest/v1/system_metrics",
            json, ANON_KEY);

        if (result.success) {
            report_count++;
            error_count = 0;
            backoff_ms  = 0;
            LOG_INFO("Report #" + std::to_string(report_count) + " accepted (HTTP " + std::to_string(result.status_code) + ")");
        } else {
            error_count++;
            backoff_ms = std::min(300000, 30000 * (1 << std::min(error_count, 5)));
            LOG_WARN("Report failed (HTTP " + std::to_string(result.status_code) + ") - backoff " + std::to_string(backoff_ms/1000) + "s [error #" + std::to_string(error_count) + "]");
        }

        // Sleep for remainder of interval
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now() - cycle_start).count();
        int sleep_ms = (backoff_ms > 0 ? backoff_ms : HEARTBEAT_SECONDS * 1000) - (int)elapsed;
        if (sleep_ms > 0) {
            std::this_thread::sleep_for(std::chrono::milliseconds(sleep_ms));
        }
    }

    LOG_INFO("Agent stopped. Total reports: " + std::to_string(report_count));
    g_log.close();
    return 0;
}
