#!/usr/bin/env bash
set -euo pipefail

# Read-only Q4Queue production evidence collector.
# Run from the directory containing the deployed docker-compose.yml.
# It prints operational aggregates only; it does not print customer records or secrets.

collected_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "Q4QUEUE_PRODUCTION_METRICS"
echo "collected_at_utc=${collected_at}"
echo "hostname=$(hostname)"

echo "[HOST]"
uname -a
df -h / /var/lib/docker 2>/dev/null || df -h /
docker version --format 'server={{.Server.Version}}' 2>/dev/null || true
docker compose version 2>/dev/null || true

echo "[CONTAINERS]"
docker compose ps
docker stats --no-stream --format 'name={{.Name}} cpu={{.CPUPerc}} memory={{.MemUsage}} memory_percent={{.MemPerc}} net_io={{.NetIO}} block_io={{.BlockIO}} pids={{.PIDs}}'

echo "[CONTAINER_LIMITS]"
for container_name in queue_postgres queue_redis queue_backend queue_frontend queue_nginx; do
  docker inspect --format 'name={{.Name}} nano_cpus={{.HostConfig.NanoCpus}} memory_bytes={{.HostConfig.Memory}}' "${container_name}" 2>/dev/null || true
done

echo "[POSTGRESQL]"
docker exec queue_postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "
SELECT '\''database_bytes|'\'' || pg_database_size(current_database());
SELECT '\''connections|'\'' || count(*) FROM pg_stat_activity WHERE datname=current_database();
SELECT '\''max_connections|'\'' || setting FROM pg_settings WHERE name='\''max_connections'\'';
SELECT '\''table_bytes|'\'' || relname || '\''|'\'' || pg_total_relation_size(relid) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;
SELECT '\''row_estimate|'\'' || relname || '\''|'\'' || n_live_tup || '\''|'\'' || n_dead_tup FROM pg_stat_user_tables ORDER BY relname;
SELECT '\''tokens_month|'\'' || to_char(date_trunc('\''month'\'', created_at), '\''YYYY-MM'\'') || '\''|'\'' || count(*) FROM tokens GROUP BY date_trunc('\''month'\'', created_at) ORDER BY date_trunc('\''month'\'', created_at);
SELECT '\''tokens_org_month|'\'' || org_id || '\''|'\'' || to_char(date_trunc('\''month'\'', created_at), '\''YYYY-MM'\'') || '\''|'\'' || count(*) FROM tokens GROUP BY org_id, date_trunc('\''month'\'', created_at) ORDER BY date_trunc('\''month'\'', created_at), org_id;
SELECT '\''whatsapp_status_month|'\'' || status || '\''|'\'' || to_char(date_trunc('\''month'\'', created_at), '\''YYYY-MM'\'') || '\''|'\'' || count(*) FROM whatsapp_messages GROUP BY status, date_trunc('\''month'\'', created_at) ORDER BY date_trunc('\''month'\'', created_at), status;
SELECT '\''calls_month|'\'' || to_char(date_trunc('\''month'\'', created_at), '\''YYYY-MM'\'') || '\''|'\'' || count(*) || '\''|'\'' || coalesce(sum(duration_seconds),0) FROM call_logs GROUP BY date_trunc('\''month'\'', created_at) ORDER BY date_trunc('\''month'\'', created_at);
"'
docker exec queue_postgres sh -lc 'du -sb /var/lib/postgresql/data /app/backups 2>/dev/null || true'

echo "[REDIS]"
docker exec queue_redis redis-cli INFO memory | grep -E '^(used_memory:|used_memory_human:|used_memory_rss:|used_memory_rss_human:|used_memory_peak:|used_memory_peak_human:|maxmemory:|maxmemory_human:|mem_fragmentation_ratio:)'
docker exec queue_redis redis-cli INFO clients | grep -E '^(connected_clients:|blocked_clients:|maxclients:)'
docker exec queue_redis redis-cli INFO stats | grep -E '^(total_connections_received:|total_commands_processed:|instantaneous_ops_per_sec:|total_net_input_bytes:|total_net_output_bytes:|rejected_connections:|evicted_keys:|keyspace_hits:|keyspace_misses:)'

echo "[LOCAL_FILES]"
for metrics_path in ./local_backups ./backups ./uploads ./logs; do
  if [ -e "${metrics_path}" ]; then
    du -sh "${metrics_path}"
    find "${metrics_path}" -type f | wc -l | awk -v p="${metrics_path}" '{print p "_file_count=" $1}'
  fi
done

echo "[EXTERNAL_EVIDENCE_REQUIRED]"
echo "server_invoice=manual_export_required"
echo "provider_bandwidth_30d_90d=manual_export_required"
echo "meta_waba_invoice_and_insights_90d=manual_export_required"
echo "plivo_invoice_and_usage_90d=manual_export_required"
echo "payment_gateway_invoice=manual_export_required"
