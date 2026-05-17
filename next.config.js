/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker — creates a standalone build with all dependencies bundled
  output: "standalone",
};

module.exports = nextConfig;
