const { Client } = require("pg");

const args = new Set(process.argv.slice(2));
const checkEnv = args.has("--check-env");
const dryRun = args.has("--dry-run");
const execute = args.has("--execute");

const expectedProjectRef = "zwkczgewzbsorbrjuzpb";
const targetEmails = [
  "cliente@doke.local",
  "profissional@doke.local",
  "suporte@doke.local",
  "admin@doke.local"
];

function fail(message) {
  console.error(`Staging multidomain canary cleanup blocked: ${message}`);
  process.exit(1);
}

if ([checkEnv, dryRun, execute].filter(Boolean).length !== 1) {
  fail("pass exactly one mode: --check-env, --dry-run, or --execute");
}

const env = String(process.env.DOKE_ENVIRONMENT || "").trim();
const rawDbUrl = String(process.env.DOKE_SUPABASE_DB_URL || "").trim();

if (env !== "staging") fail("DOKE_ENVIRONMENT must be staging.");
if (!rawDbUrl) fail("DOKE_SUPABASE_DB_URL is missing.");
if (!rawDbUrl.includes(expectedProjectRef)) {
  fail(`DOKE_SUPABASE_DB_URL must target project ${expectedProjectRef}.`);
}

if (checkEnv) {
  console.log("Staging multidomain canary cleanup environment is valid. No database connection was opened.");
  console.log(`- target project: ${expectedProjectRef}`);
  console.log("- connection string: present and hidden");
  process.exit(0);
}

const parsed = new URL(rawDbUrl);
parsed.searchParams.delete("sslmode");
parsed.searchParams.delete("sslcert");
parsed.searchParams.delete("sslkey");
parsed.searchParams.delete("sslrootcert");

const client = new Client({
  connectionString: parsed.toString(),
  ssl: { rejectUnauthorized: false },
  application_name: dryRun
    ? "doke-staging-multidomain-canary-cleanup-dry-run"
    : "doke-staging-multidomain-canary-cleanup-execute",
  connectionTimeoutMillis: 15000,
  query_timeout: 30000
});

async function tableExists(table) {
  const result = await client.query(
    `
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = $1
      ) as exists
    `,
    [table]
  );
  return Boolean(result.rows[0]?.exists);
}

async function count(label, query, values) {
  const result = await client.query(query, values);
  const value = Number(result.rows[0]?.count || 0);
  console.log(`- ${label}: ${value}`);
  return value;
}

async function deleteIfTable(table, label, query, values) {
  if (!(await tableExists(table))) {
    console.log(`- ${label}: skipped; public.${table} does not exist`);
    return 0;
  }

  const result = await client.query(query, values);
  const deleted = Number(result.rowCount || 0);
  console.log(`- ${label}: ${deleted}`);
  return deleted;
}

(async () => {
  await client.connect();
  await client.query("begin");
  await client.query("set local statement_timeout = '30s'");

  const usersResult = await client.query(
    `
      select
        au.id,
        au.id::text as id_text,
        au.email,
        pu.role,
        pu.status
      from auth.users au
      left join public.users pu on pu.id = au.id
      where lower(au.email) = any($1::text[])
      order by lower(au.email)
    `,
    [targetEmails]
  );

  const users = usersResult.rows;
  const ids = users.map((row) => row.id_text);

  console.log(dryRun
    ? "Staging multidomain canary cleanup dry-run preview:"
    : "Staging multidomain canary cleanup execution:"
  );

  console.log("\nMatched users:");
  for (const user of users) {
    console.log(`- ${user.email}; id=${user.id_text}; role=${user.role}; status=${user.status}`);
  }

  if (users.length !== 4) {
    fail(`expected exactly 4 canary users, found ${users.length}`);
  }

  const orderIdsResult = await client.query(
    `
      select id::text
      from public.orders
      where client_id = any($1::uuid[])
         or professional_id = any($1::uuid[])
    `,
    [ids]
  );
  const orderIds = orderIdsResult.rows.map((row) => row.id);

  const conversationIdsResult = await client.query(
    `
      select id::text
      from public.conversations
      where client_id = any($1::uuid[])
         or professional_id = any($1::uuid[])
         or order_id = any($2::uuid[])
    `,
    [ids, orderIds]
  );
  const conversationIds = conversationIdsResult.rows.map((row) => row.id);

  const transactionIdsResult = await client.query(
    `
      select id::text
      from public.transactions
      where wallet_user_id = any($1::uuid[])
         or order_id = any($2::uuid[])
    `,
    [ids, orderIds]
  );
  const transactionIds = transactionIdsResult.rows.map((row) => row.id);

  console.log("\nPlanned target counts:");
  await count("orders", "select count(*) from public.orders where id = any($1::uuid[])", [orderIds]);
  await count("conversations", "select count(*) from public.conversations where id = any($1::uuid[])", [conversationIds]);

  if (await tableExists("messages")) {
    await count(
      "messages",
      `
        select count(*)
        from public.messages
        where sender_id = any($1::uuid[])
           or conversation_id = any($2::uuid[])
      `,
      [ids, conversationIds]
    );
  }

  if (await tableExists("notifications")) {
    await count(
      "notifications",
      `
        select count(*)
        from public.notifications
        where user_id = any($1::uuid[])
      `,
      [ids]
    );
  }

  if (await tableExists("wallets")) {
    await count(
      "wallets",
      `
        select count(*)
        from public.wallets
        where user_id = any($1::uuid[])
      `,
      [ids]
    );
  }

  if (await tableExists("transactions")) {
    await count(
      "transactions",
      `
        select count(*)
        from public.transactions
        where id = any($1::uuid[])
      `,
      [transactionIds]
    );
  }

  if (await tableExists("withdrawals")) {
    await count(
      "withdrawals",
      `
        select count(*)
        from public.withdrawals
        where wallet_user_id = any($1::uuid[])
           or requested_by = any($1::uuid[])
           or decided_by = any($1::uuid[])
      `,
      [ids]
    );
  }

  if (await tableExists("receipts")) {
    await count(
      "receipts",
      `
        select count(*)
        from public.receipts
        where user_id = any($1::uuid[])
           or order_id = any($2::uuid[])
           or transaction_id = any($3::uuid[])
      `,
      [ids, orderIds, transactionIds]
    );
  }

  if (await tableExists("order_status_history")) {
    await count(
      "order_status_history",
      `
        select count(*)
        from public.order_status_history
        where actor_id = any($1::uuid[])
           or order_id = any($2::uuid[])
      `,
      [ids, orderIds]
    );
  }

  console.log("\nDelete simulation order:");

  await deleteIfTable(
    "messages",
    "messages deleted",
    `
      delete from public.messages
      where sender_id = any($1::uuid[])
         or conversation_id = any($2::uuid[])
    `,
    [ids, conversationIds]
  );

  await deleteIfTable(
    "notifications",
    "notifications deleted",
    `
      delete from public.notifications
      where user_id = any($1::uuid[])
    `,
    [ids]
  );

  await deleteIfTable(
    "withdrawals",
    "withdrawals deleted",
    `
      delete from public.withdrawals
      where wallet_user_id = any($1::uuid[])
         or requested_by = any($1::uuid[])
         or decided_by = any($1::uuid[])
    `,
    [ids]
  );

  await deleteIfTable(
    "receipts",
    "receipts deleted",
    `
      delete from public.receipts
      where user_id = any($1::uuid[])
         or order_id = any($2::uuid[])
         or transaction_id = any($3::uuid[])
    `,
    [ids, orderIds, transactionIds]
  );

  await deleteIfTable(
    "transactions",
    "transactions deleted",
    `
      delete from public.transactions
      where id = any($1::uuid[])
    `,
    [transactionIds]
  );

  await deleteIfTable(
    "order_status_history",
    "order_status_history deleted",
    `
      delete from public.order_status_history
      where actor_id = any($1::uuid[])
         or order_id = any($2::uuid[])
    `,
    [ids, orderIds]
  );

  await deleteIfTable(
    "conversations",
    "conversations deleted",
    `
      delete from public.conversations
      where id = any($1::uuid[])
    `,
    [conversationIds]
  );

  await deleteIfTable(
    "wallets",
    "wallets deleted",
    `
      delete from public.wallets
      where user_id = any($1::uuid[])
    `,
    [ids]
  );

  await deleteIfTable(
    "orders",
    "orders deleted",
    `
      delete from public.orders
      where id = any($1::uuid[])
    `,
    [orderIds]
  );

  await deleteIfTable(
    "users",
    "public.users deleted",
    `
      delete from public.users
      where id = any($1::uuid[])
    `,
    [ids]
  );

  const authDeleted = await client.query(
    `
      delete from auth.users
      where id = any($1::uuid[])
    `,
    [ids]
  );
  console.log(`- auth.users deleted: ${authDeleted.rowCount}`);

  if (dryRun) {
    await client.query("rollback");
    console.log("\nDry-run completed. Transaction rolled back. No data was deleted.");
  } else {
    await client.query("commit");
    console.log("\nExecution completed. Canary multidomain data was deleted.");
  }

  await client.end();
})().catch(async (error) => {
  try { await client.query("rollback"); } catch {}
  try { await client.end(); } catch {}
  console.error(error.message || error);
  process.exit(1);
});
