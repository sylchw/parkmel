import Link from "next/link";
import {safeReturnDestination} from "../../lib/server/auth";
const messages:Record<string,string>={password_updated:"Password updated. Sign in with your new password.",invalid_request:"Please try again.",invalid_credentials:"Enter a valid email and a password of 8–256 characters.",signup_unavailable:"Account creation is unavailable. Please try again later.",check_email:"Check your email to confirm your account before signing in.",signin_failed:"Sign-in failed. Check your details and email confirmation.",verify_email:"Confirm your email before signing in.",auth_unavailable:"Sign-in is not configured or is temporarily unavailable."};
export default async function SignIn({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const params=await searchParams;
 const next=typeof params.next==="string"?new URL(safeReturnDestination(params.next,"https://parkmel.invalid")).pathname+new URL(safeReturnDestination(params.next,"https://parkmel.invalid")).search+new URL(safeReturnDestination(params.next,"https://parkmel.invalid")).hash:"/";
 const message=typeof params.message==="string"?messages[params.message]:null;
 return <main className="auth-page"><div className="auth-card"><Link className="auth-brand" href="/">ParkMel</Link><h1>Sign in to ParkMel</h1>
  <p>A verified email account is required to annotate. Submissions start unverified; community agreement or admin approval is separate.</p>
  {message && <p role="status">{message}</p>}
  <form className="auth-form" action="/auth/email" method="post"><input type="hidden" name="next" value={next}/>
   <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
   <label>Password<input name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={256}/></label>
   <div className="auth-actions"><button className="auth-primary" name="action" value="signin" type="submit">Sign in</button>
   <button className="auth-secondary" name="action" value="signup" type="submit">Create account</button></div>
  </form><p><Link href="/forgot-password">Forgot password?</Link></p><p>After creating an account, follow the confirmation email, then sign in.</p><Link href="/">Return to ParkMel</Link>
 </div></main>;
}
