import { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      uatId?: string;
      activeAssociationId?: string;
      civicType?: string; // CivicType: CETATEAN_S1 | PROPRIETAR | NEIDENTIFICAT
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?: string;
    role?: string;
    uatId?: string;
    activeAssociationId?: string;
    civicType?: string;
    mustChangePassword?: boolean;
  }
}
