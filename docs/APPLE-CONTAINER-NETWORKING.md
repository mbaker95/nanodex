# Apple Container Networking Setup

Apple Container on macOS may need manual host networking setup before containers can reach external APIs.

## Quick Setup

```bash
# 1. Enable IP forwarding
sudo sysctl -w net.inet.ip.forwarding=1

# 2. Enable NAT for the vmnet subnet
echo "nat on en0 from 192.168.64.0/24 to any -> (en0)" | sudo pfctl -ef -
```

Replace `en0` with your active interface:

```bash
route get 8.8.8.8 | grep interface
```

## Verification

```bash
sysctl net.inet.ip.forwarding

container run --rm --entrypoint curl nanodex-agent:latest \
  -s4 --connect-timeout 5 -o /dev/null -w "%{http_code}" https://api.openai.com/v1/models
```

Expected result: an HTTP response code instead of a timeout.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Connection timed out | IP forwarding disabled | Enable `net.inet.ip.forwarding=1` |
| HTTPS fails but local mounts work | NAT missing | Re-apply the `pfctl` rule |
| DNS resolution fails | Bridge/NAT not active | Check `bridge100` while a container is running |
| Build succeeds but agent cannot call APIs | Outbound network missing | Test with `curl` inside the image |

## Notes

- Docker remains the default runtime in this fork.
- Apple Container is still supported, but it is not the primary tested path.
