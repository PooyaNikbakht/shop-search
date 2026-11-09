import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No ISR or data cache is used, so the default (no incremental cache) is enough.
export default defineCloudflareConfig({});
