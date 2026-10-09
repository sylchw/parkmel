import Link from "next/link";
const messages:Record<string,string>={sent:"If an account exists for that email, a reset link has been requested. Check your inbox and spam folder.",invalid:"Enter a valid email address.",unavailable:"Password reset is temporarily unavailable. Please try again later.",expired:"The reset link or session has expired. Request a new link."};
export default async function ForgotPassword({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;const message=typeof params.message==="string"?messages[params.message]:null;
 return <main className="auth-page"><div className="auth-card"><Link className="auth-brand" href="/">ParkMel</Link><h1>Forgot password?</h1><p>Enter your account email to request a password reset link. Open the link in the same browser where you requested it.</p>{message&&<p role="status">{message}</p>}
 <form className="auth-form" action="/auth/password" method="post"><input type="hidden" name="action" value="request"/><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><div className="auth-actions"><button className="auth-primary" type="submit">Send reset link</button></div></form><Link href="/sign-in">Back to sign in</Link></div></main>;
}
