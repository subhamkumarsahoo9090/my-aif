import { controller } from "./respond.js";
import * as auth from "../functions/auth.functions.js";

export const login = controller((req) => auth.login(req.body ?? {}));
export const accounts = controller(() => auth.accounts());
export const deleteAccount = controller((req) => auth.deleteAccount(req.body ?? {}));
export const logout = controller(() => auth.logout());
export const session = controller(() => auth.session());
export const forgot = controller((req) => auth.forgot(req.body ?? {}));
export const verifyOtp = controller((req) => auth.verifyOtp(req.body ?? {}));
export const resetPassword = controller((req) => auth.resetPassword(req.body ?? {}));
