do $$
declare
  function_sql text;
begin
  select pg_get_functiondef(
    'public.verify_attendance_submission(uuid,uuid,text,timestamp with time zone,double precision,double precision,double precision,text,text,text,uuid,text,text,boolean)'::regprocedure
  )
  into function_sql;

  function_sql := replace(
    function_sql,
    'server_now between schedule_record.check_in_opens_at and coalesce(schedule_record.late_ends_at, schedule_record.check_in_closes_at)',
    'server_now between schedule_record.check_in_opens_at and greatest(schedule_record.check_in_closes_at, coalesce(schedule_record.late_ends_at, schedule_record.check_in_closes_at))'
  );

  function_sql := replace(
    function_sql,
    'when schedule_record.late_ends_at is not null and server_now > schedule_record.check_in_closes_at and server_now <= schedule_record.late_ends_at then ''late''',
    'when schedule_record.late_ends_at is not null and schedule_record.late_ends_at > schedule_record.check_in_closes_at and server_now > schedule_record.check_in_closes_at and server_now <= schedule_record.late_ends_at then ''late'''
  );

  execute function_sql;
end $$;
