import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                name: { label: "Name", type: "text" },
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // Dummy Login Logic: Sync with backend immediately
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                    console.log(`Authorizing dummy user ${credentials.email}...`);

                    // Reuse the google sync endpoint but with password as googleId (since googleId is required/unique in DB)
                    // This satisfies "don't change google login system" by reusing existing backend logic
                    const response = await fetch(`${apiUrl}/api/auth/google`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            name: credentials.name || 'Dummy User',
                            avatar: '', // No avatar
                            googleId: `dummy-${credentials.email}`, // ID derived from email to be unique and consistent
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.user) {
                            return {
                                id: data.user.id, // This is the REAL DB ID
                                name: data.user.name,
                                email: data.user.email,
                                image: data.user.avatar
                            };
                        }
                    }
                } catch (error) {
                    console.error("Dummy auth failed", error);
                }
                return null;
            }
        })
    ],
    events: {
        async signIn(message) { console.log('SignIn event', message); }
    },

    callbacks: {
        async signIn({ user, account, profile }) {
            return true;
        },
        async jwt({ token, user, account }) {
            // Initial sign in
            if (user) {
                token.email = user.email;
                token.name = user.name;
                token.picture = user.image;

                // If credentials, we already have the DB ID from authorize()
                if (account?.provider === 'credentials') {
                    token.backendId = user.id;
                }
            }

            // Sync with backend if we don't have the ID yet (Google Flow)
            if (!token.backendId && token.email) {
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                    console.log(`Syncing user ${token.email} with backend at ${apiUrl}...`);

                    const response = await fetch(`${apiUrl}/api/auth/google`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: token.email,
                            name: token.name,
                            avatar: token.picture,
                            googleId: account?.providerAccountId || token.sub,
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.user && data.user.id) {
                            token.backendId = data.user.id;
                            console.log("Backend ID synced:", token.backendId);
                        }
                    } else {
                        console.error("Backend sync failed:", await response.text());
                    }
                } catch (error) {
                    console.error("Error syncing user with backend:", error);
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.email = token.email as string;
                session.user.name = token.name as string;
                session.user.image = token.picture as string;
                if (token.backendId) {
                    (session.user as any).id = token.backendId;
                }
            }
            return session;
        },
    },

    pages: {
        signIn: "/",
    },
});

export { handler as GET, handler as POST };
