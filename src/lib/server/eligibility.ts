export type SessionKind = "guest" | "unverified" | "eligible" | "admin";
export interface ServerSession { kind: SessionKind; userId: string | null; reason: string }
/** Adapter implementations must verify sessions server-side, never read client role/email flags. */
export interface EligibilityAdapter {
 readVerifiedUser(): Promise<unknown>;
 readProfile(userId: string): Promise<unknown>;
}
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function serverEligibility(adapter: EligibilityAdapter): Promise<ServerSession> {
 let user: unknown;
 try { user = await adapter.readVerifiedUser(); } catch { return {kind:"guest",userId:null,reason:"session_unavailable"}; }
 if (!object(user) || !uuid(user.id)) return {kind:"guest",userId:null,reason:"missing_session"};
 const denied = (reason: string): ServerSession => ({kind:"unverified",userId:user.id as string,reason});
 if (user.emailVerified !== true && user.providerAssertionVerified !== true) return denied("credential_unverified");
 let profile: unknown;
 try { profile = await adapter.readProfile(user.id); } catch { return denied("profile_unavailable"); }
 if (!object(profile) || profile.id !== user.id || profile.eligibility !== "eligible" ||
     (profile.role !== "user" && profile.role !== "admin")) return denied("profile_ineligible");
 return {kind:profile.role === "admin" ? "admin" : "eligible",userId:user.id,reason:"verified"};
}
export function canUseProtectedFeatures(session: ServerSession): boolean {
 return session.kind === "eligible" || session.kind === "admin";
}
