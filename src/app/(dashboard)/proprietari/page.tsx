// Redirect from old /proprietari route to /locatari
import { redirect } from "next/navigation";

export default function ProprietariRedirect() {
  redirect("/locatari");
}
