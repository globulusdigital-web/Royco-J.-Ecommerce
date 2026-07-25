import { createApiHandler } from "../lib/api-handler.mjs";
import { installProcessSafety } from "../lib/runtime-safety.mjs";

installProcessSafety();
export default createApiHandler();

