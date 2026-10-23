import Link from "next/link";
import {redirect} from "next/navigation";
import {pageUser} from "../../lib/server/page-auth";
const messages:Record<string,string>={invalid:"Use matching passwords of 8–256 characters.",failed:"The password could not be changed. Try again or request a new reset link."};
export const dynamic="force-dynamic";
export default async function ResetPassword({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const user=await pageUser();if(!user?.email_confirmed_at)redirect("/forgot-password?message=expired");
 const params=await searchParams,message=typeof params.message==="string"?messages[params.message]:null;
 return <main className="auth-page"><div className="auth-card"><Link className="auth-brand" href="/">ParkMel</Link><h1>Choose a new password</h1><p>Use at least eight characters. You will sign in again after saving.</p>{message&&<p role="status">{message}</p>}
 <form className="auth-form" action="/auth/password" method="post"><input type="hidden" name="action" value="update"/><label>New password<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={256}/></label><label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={256}/></label><div className="auth-actions"><button className="auth-primary" type="submit">Save new password</button></div></form><Link href="/">Return to ParkMel</Link></div></main>;
}
