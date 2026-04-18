cmake_minimum_required(VERSION 3.16)
project(ProcurBosseAgent VERSION 4.9.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT WIN32)
    message(FATAL_ERROR "This target is Windows-only")
endif()

add_executable(procurbosse-agent WIN32
    procurbosse-agent.cpp
)

# Windows 7 SP1 minimum (NT 6.1)
target_compile_definitions(procurbosse-agent PRIVATE
    AGENT_VERSION="4.9.0"
    _WIN32_WINNT=0x0601
    NTDDI_VERSION=0x06010000
    WIN32_LEAN_AND_MEAN
    NOMINMAX
    _CRT_SECURE_NO_WARNINGS
)

# Link libraries
target_link_libraries(procurbosse-agent
    winhttp
    pdh
    psapi
    ws2_32
    wtsapi32
    netapi32
)

# Static runtime for portability (no MSVCRT dependency on target machine)
if(MSVC)
    set_property(TARGET procurbosse-agent
        PROPERTY MSVC_RUNTIME_LIBRARY "MultiThreaded")
else()
    # MinGW: static link C/C++ runtime
    target_link_options(procurbosse-agent PRIVATE
        -static
        -static-libgcc
        -static-libstdc++
    )
endif()

# Subsystem: console (so log output visible when run directly)
if(MSVC)
    set_target_properties(procurbosse-agent PROPERTIES
        LINK_FLAGS "/SUBSYSTEM:CONSOLE"
    )
endif()

set_target_properties(procurbosse-agent PROPERTIES
    OUTPUT_NAME "procurbosse-agent"
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)

install(TARGETS procurbosse-agent
    RUNTIME DESTINATION bin
)

# Show size after build
add_custom_command(TARGET procurbosse-agent POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E echo "Agent built: $<TARGET_FILE:procurbosse-agent>"
    VERBATIM
)
