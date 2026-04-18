/**
 * ProcurBosse  -- SQL Server / ODBC Migration Engine
 * Safely migrates Supabase data to SQL Server via ODBC connection string.
 * Generates DDL + INSERT scripts compatible with SQL Server 2008+.
 */

export interface MigrationConfig {
  connectionName: string;
  serverHost:     string;
  serverPort:     number;
  database:       string;
  username:       string;
  password:       string;
  schema:         string;
  tables:         string[];
  dryRun:         boolean;
  batchSize:      number;
}

export interface TableSchema {
  tableName:   string;
  columns:     ColumnDef[];
  primaryKey:  string[];
  rowCount:    number;
  sampleData:  any[];
}

export interface ColumnDef {
  name:       string;
  supaType:   string;
  sqlType:    string;
  nullable:   boolean;
  maxLength?: number;
}

export interface MigrationResult {
  success:  boolean;
  table:    string;
  rows:     number;
  errors:   string[];
  duration: number;
  sql:      string;
}

/** Map Supabase/Postgres column types to SQL Server equivalents */
export function mapToSqlServerType(pgType: string, maxLength?: number): string {
  const t = pgType.toLowerCase().replace(/\(.*\)/, "").trim();
  const map: Record<string, string> = {
    "uuid":             "UNIQUEIDENTIFIER",
    "text":             "NVARCHAR(MAX)",
    "varchar":          maxLength ? `NVARCHAR(${Math.min(maxLength, 4000)})` : "NVARCHAR(500)",
    "character varying":maxLength ? `NVARCHAR(${Math.min(maxLength, 4000)})` : "NVARCHAR(500)",
    "integer":          "INT",
    "int4":             "INT",
    "int8":             "BIGINT",
    "bigint":           "BIGINT",
    "smallint":         "SMALLINT",
    "numeric":          "DECIMAL(18,4)",
    "decimal":          "DECIMAL(18,4)",
    "float4":           "FLOAT",
    "float8":           "FLOAT",
    "double precision": "FLOAT",
    "boolean":          "BIT",
    "bool":             "BIT",
    "json":             "NVARCHAR(MAX)",
    "jsonb":            "NVARCHAR(MAX)",
    "timestamp":        "DATETIME2",
    "timestamptz":      "DATETIMEOFFSET",
    "timestamp with time zone": "DATETIMEOFFSET",
    "timestamp without time zone": "DATETIME2",
    "date":             "DATE",
    "time":             "TIME",
    "interval":         "NVARCHAR(50)",
    "bytea":            "VARBINARY(MAX)",
    "array":            "NVARCHAR(MAX)",
    "_text":            "NVARCHAR(MAX)",
    "user-defined":     "NVARCHAR(100)",
    "character":        "NCHAR(1)",
  };
  return map[t] || "NVARCHAR(255)";
}

/** Generate CREATE TABLE DDL for SQL Server */
export function generateCreateTable(schema: TableSchema, targetSchema = "dbo", dropFirst = true): string {
  const fullName = `[${targetSchema}].[${schema.tableName}]`;
  const colDefs = schema.columns.map(c => {
    const sqlType = c.sqlType || mapToSqlServerType(c.supaType, c.maxLength);
    const nullable = c.nullable ? "NULL" : "NOT NULL";
    const identity = c.name === "id" && c.supaType === "integer" ? " IDENTITY(1,1)" : "";
    return `    [${c.name}] ${sqlType}${identity} ${nullable}`;
  }).join(",\n");

  const pk = schema.primaryKey.length > 0
    ? `,\n    CONSTRAINT [PK_${schema.tableName}] PRIMARY KEY ([${schema.primaryKey.join("], [")}])`
    : "";

  return [
    dropFirst ? `IF OBJECT_ID('${fullName}', 'U') IS NOT NULL DROP TABLE ${fullName};\nGO` : "",
    `CREATE TABLE ${fullName} (`,
    colDefs,
    pk,
    `);`,
    `GO`,
    `-- Index on created_at if exists`,
    schema.columns.find(c => c.name === "created_at")
      ? `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_${schema.tableName}_created_at')\n    CREATE INDEX [IX_${schema.tableName}_created_at] ON ${fullName} ([created_at] DESC);\nGO`
      : "",
  ].filter(Boolean).join("\n");
}

/** Generate INSERT batches for SQL Server */
export function generateInsertScript(schema: TableSchema, data: any[], targetSchema = "dbo", batchSize = 500): string {
  if (!data || data.length === 0) return `-- No data to migrate for ${schema.tableName}\n`;
  const fullName = `[${targetSchema}].[${schema.tableName}]`;
  const cols = schema.columns.map(c => `[${c.name}]`).join(", ");
  const lines: string[] = [`-- INSERT data for ${schema.tableName} (${data.length} rows)`, `SET IDENTITY_INSERT ${fullName} ON;\nGO`];

  function escapeVal(v: any, c: ColumnDef): string {
    if (v === null || v === undefined) return "NULL";
    const t = (c.sqlType || "").toUpperCase();
    if (t === "BIT") return v ? "1" : "0";
    if (t.includes("INT") || t.includes("FLOAT") || t.includes("DECIMAL")) return String(parseFloat(v) || 0);
    if (t === "UNIQUEIDENTIFIER") return `'${v}'`;
    if (t.includes("DATE") || t.includes("TIME")) return `'${String(v).replace("'","''")}'`;
    // For JSON/text, serialize objects
    const str = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `N'${str.replace(/'/g, "''")}'`;
  }

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i+batchSize);
    const valRows = batch.map(row =>
      `(${schema.columns.map(c => escapeVal(row[c.name], c)).join(", ")})`
    ).join(",\n");
    lines.push(`INSERT INTO ${fullName} (${cols})\nVALUES\n${valRows};\nGO`);
  }

  lines.push(`SET IDENTITY_INSERT ${fullName} OFF;\nGO`);
  return lines.join("\n\n");
}

/** Build full migration script for all tables */
export function buildFullMigrationScript(
  schemas: TableSchema[],
  dataMap: Record<string, any[]>,
  config: Partial<MigrationConfig>
): string {
  const targetSchema = config.schema || "dbo";
  const db = config.database || "MediProcureEL5";
  const lines: string[] = [
    `-- ============================================================`,
    `-- ProcurBosse  -- EL5 MediProcure SQL Server Migration Script`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Source: Supabase (yvjfehnzbzjliizjvuhq)`,
    `-- Target: ${db} on ${config.serverHost||"localhost"}`,
    `-- Tables: ${schemas.length}`,
    `-- ============================================================`,
    `USE [${db}];`,
    `GO`,
    ``,
    `-- Create schema if needed`,
    `IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = '${targetSchema}')`,
    `    EXEC('CREATE SCHEMA [${targetSchema}]');`,
    `GO`,
    ``,
    `-- -- DDL: Create Tables ------------------------------------------`,
    ``,
  ];

  // DDL first
  for (const schema of schemas) {
    lines.push(`-- Table: ${schema.tableName} (${schema.rowCount} rows)`);
    lines.push(generateCreateTable(schema, targetSchema, true));
    lines.push("");
  }

  // Data second
  lines.push(`-- -- DML: Insert Data --------------------------------------------`);
  lines.push("");
  for (const schema of schemas) {
    const data = dataMap[schema.tableName] || [];
    lines.push(generateInsertScript(schema, data, targetSchema, config.batchSize||500));
    lines.push("");
  }

  lines.push(`-- ============================================================`);
  lines.push(`-- Migration complete: ${schemas.length} tables, ${Object.values(dataMap).reduce((s,a)=>s+a.length,0)} rows`);
  lines.push(`-- ============================================================`);

  return lines.join("\n");
}

/** Core Supabase tables for EL5 MediProcure */
export const CORE_TABLES = [
  "profiles","departments","suppliers","items","categories",
  "requisitions","requisition_items",
  "purchase_orders","purchase_order_items",
  "goods_received","grn_items",
  "contracts","tenders","bid_evaluations",
  "payment_vouchers","receipt_vouchers","journal_vouchers","purchase_vouchers","sales_vouchers",
  "budgets","chart_of_accounts","fixed_assets",
  "quality_inspections","non_conformance_reports",
  "documents","audit_logs","notifications",
  "system_settings","system_broadcasts","module_settings",
  "external_connections","admin_inbox",
];

/** Column definitions for all known tables (used when introspection unavailable) */
export const SCHEMA_REGISTRY: Record<string, Omit<ColumnDef,"sqlType">[]> = {
  profiles: [
    {name:"id",supaType:"uuid",nullable:false},
    {name:"email",supaType:"varchar",nullable:false,maxLength:255},
    {name:"full_name",supaType:"varchar",nullable:true,maxLength:255},
    {name:"role",supaType:"varchar",nullable:true,maxLength:50},
    {name:"department",supaType:"varchar",nullable:true,maxLength:100},
    {name:"phone",supaType:"varchar",nullable:true,maxLength:20},
    {name:"is_active",supaType:"boolean",nullable:false},
    {name:"created_at",supaType:"timestamptz",nullable:true},
    {name:"updated_at",supaType:"timestamptz",nullable:true},
  ],
  requisitions: [
    {name:"id",supaType:"uuid",nullable:false},
    {name:"requisition_number",supaType:"varchar",nullable:true,maxLength:50},
    {name:"title",supaType:"text",nullable:false},
    {name:"department",supaType:"varchar",nullable:true,maxLength:100},
    {name:"requester_id",supaType:"uuid",nullable:true},
    {name:"requester_name",supaType:"varchar",nullable:true,maxLength:255},
    {name:"status",supaType:"varchar",nullable:true,maxLength:50},
    {name:"priority",supaType:"varchar",nullable:true,maxLength:20},
    {name:"total_amount",supaType:"numeric",nullable:true},
    {name:"required_date",supaType:"date",nullable:true},
    {name:"justification",supaType:"text",nullable:true},
    {name:"created_at",supaType:"timestamptz",nullable:true},
    {name:"updated_at",supaType:"timestamptz",nullable:true},
  ],
  purchase_orders: [
    {name:"id",supaType:"uuid",nullable:false},
    {name:"po_number",supaType:"varchar",nullable:true,maxLength:50},
    {name:"requisition_id",supaType:"uuid",nullable:true},
    {name:"supplier_id",supaType:"uuid",nullable:true},
    {name:"supplier_name",supaType:"varchar",nullable:true,maxLength:255},
    {name:"status",supaType:"varchar",nullable:true,maxLength:50},
    {name:"total_amount",supaType:"numeric",nullable:true},
    {name:"delivery_date",supaType:"date",nullable:true},
    {name:"payment_terms",supaType:"varchar",nullable:true,maxLength:100},
    {name:"created_at",supaType:"timestamptz",nullable:true},
    {name:"updated_at",supaType:"timestamptz",nullable:true},
  ],
  suppliers: [
    {name:"id",supaType:"uuid",nullable:false},
    {name:"name",supaType:"varchar",nullable:false,maxLength:255},
    {name:"email",supaType:"varchar",nullable:true,maxLength:255},
    {name:"phone",supaType:"varchar",nullable:true,maxLength:50},
    {name:"address",supaType:"text",nullable:true},
    {name:"pin_number",supaType:"varchar",nullable:true,maxLength:50},
    {name:"category",supaType:"varchar",nullable:true,maxLength:100},
    {name:"status",supaType:"varchar",nullable:true,maxLength:20},
    {name:"created_at",supaType:"timestamptz",nullable:true},
  ],
  system_settings: [
    {name:"id",supaType:"integer",nullable:false},
    {name:"key",supaType:"varchar",nullable:false,maxLength:100},
    {name:"value",supaType:"text",nullable:true},
    {name:"updated_at",supaType:"timestamptz",nullable:true},
    {name:"updated_by",supaType:"uuid",nullable:true},
  ],
};

/** Generate ODBC connection string for SQL Server */
export function buildOdbcString(cfg: Partial<MigrationConfig>): string {
  return [
    `Driver={ODBC Driver 17 for SQL Server}`,
    `Server=${cfg.serverHost||"localhost"},${cfg.serverPort||1433}`,
    `Database=${cfg.database||"MediProcureEL5"}`,
    `Uid=${cfg.username||"sa"}`,
    `Pwd=${cfg.password||""}`,
    `Encrypt=optional`,
    `TrustServerCertificate=yes`,
    `Connection Timeout=30`,
  ].join(";");
}

/** Build DDL for creating the target SQL Server database */
export function buildCreateDatabaseScript(dbName: string): string {
  return `-- Create MediProcure database on SQL Server
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${dbName}')
BEGIN
    CREATE DATABASE [${dbName}]
    COLLATE Latin1_General_CI_AS;
    PRINT 'Database ${dbName} created.';
END
GO

USE [${dbName}];
GO

-- Create application login (change password!)
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'mediprocure_app')
BEGIN
    CREATE LOGIN [mediprocure_app] WITH PASSWORD = 'ProcurBosse@2025!', DEFAULT_DATABASE = [${dbName}];
    PRINT 'Login mediprocure_app created.';
END
GO

CREATE USER [mediprocure_app] FOR LOGIN [mediprocure_app];
ALTER ROLE [db_datareader] ADD MEMBER [mediprocure_app];
ALTER ROLE [db_datawriter] ADD MEMBER [mediprocure_app];
GO

PRINT 'Database setup complete. Ready for migration.';
GO`;
}
