import type { NextConfig } from "next";
import { config as loadDotenv } from "dotenv";
import path from "path";

// Load the single root-level .env before Next.js processes NEXT_PUBLIC_ vars
loadDotenv({ path: path.resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {};

export default nextConfig;
