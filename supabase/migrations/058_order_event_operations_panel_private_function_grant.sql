-- Remote history parity: the private actor assertion is callable only by the server role.
revoke all on function private.assert_order_event_operator(uuid) from public, anon, authenticated;
grant execute on function private.assert_order_event_operator(uuid) to service_role;
