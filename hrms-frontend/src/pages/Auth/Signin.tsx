import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldDescription } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";
import { toast } from "sonner";
import { getprofile, signinUser } from "@/services/auth.service";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { signinSchema } from "@/validation/auth.validation";
import Light_BG from "@/assets/Light_BG.png";

const Signin = () => {
    const navigate = useNavigate();
    const { setUser, setLoading } = useAuthStore();

    const [spinner, setSpinner] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState<{
        email?: string;
        password?: string;
    }>({});

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setError({});

        if (!email || !password) {
            setError({
                email: !email ? "Email is required" : undefined,
                password: !password ? "Password is required" : undefined,
            });
            return;
        }

        const result = signinSchema.safeParse({
            email,
            password,
        });

        if (!result.success) {
            const fieldErrors = result.error.flatten().fieldErrors;

            setError({
                email: fieldErrors.email?.[0],
                password: fieldErrors.password?.[0],
            });

            return;
        }

        try {
            setSpinner(true);
            setLoading(true);

            await signinUser({ email, password });
            const profileRes = await getprofile();

            setUser(profileRes.data);

            navigate("/dashboard");

            toast.success("Login successful");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Invalid email or password");
        } finally {
            setSpinner(false);
            setLoading(false);
        }
    };

    const handleChange = (
        name: "email" | "password",
        value: string
    ) => {
        if (name === "email") {
            setEmail(value);
        } else {
            setPassword(value);
        }

        const fieldSchema = signinSchema.shape[name];
        const result = fieldSchema.safeParse(value);

        setError((prev) => ({
            ...prev,
            [name]: result.success
                ? undefined
                : result.error.issues[0]?.message,
        }));
    };

    return (
        <div className="min-h-screen bg-background">
            <main className="flex min-h-screen items-center justify-center px-5 py-4">
                <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-xl sm:p-8">

                    {/* Logo */}
                    <div className="mb-4 flex justify-center">
                        <img
                            src={Light_BG}
                            alt="Dynamic HRMS Logo"
                            className="h-12 w-auto object-contain rounded-lg"
                        />
                    </div>

                    {/* Login Heading */}
                    <div className="mb-5 text-center">
                        <h2 className="text-2xl font-bold tracking-tight">
                            Welcome back
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Sign in to your HRMS account to continue
                        </p>
                    </div>


                    {/* Login Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >

                        {/* Email */}
                        <Field>
                            <Label htmlFor="email">
                                Email
                            </Label>

                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) =>
                                    handleChange("email", e.target.value)
                                }
                                className="mt-2"
                            />

                            {error.email && (
                                <p className="mt-1 text-sm text-destructive">
                                    {error.email}
                                </p>
                            )}
                        </Field>

                        {/* Password */}
                        <Field>
                            <Label htmlFor="password">
                                Password
                            </Label>

                            <div className="relative mt-2">

                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) =>
                                        handleChange("password", e.target.value)
                                    }
                                    className="pr-10"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>

                            </div>

                            {error.password && (
                                <p className="mt-1 text-sm text-destructive">
                                    {error.password}
                                </p>
                            )}
                        </Field>

                        {/* Forgot Password */}
                        <div className="flex justify-end">
                            <Link
                                to="/forgot-password"
                                className="text-sm font-medium text-[var(--themePrimary)] hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Sign In Button */}
                        <Button
                            type="submit"
                            disabled={spinner}
                            className="w-full cursor-pointer bg-[var(--themePrimary)] py-5 text-base hover:bg-[var(--card-green-hover)]"
                        >
                            {spinner ? (
                                <>
                                    <Spinner className="mr-2" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </Button>

                        {/* Back */}
                        <FieldDescription className="pt-2">
                            <Link
                                to="/"
                                className="group flex items-center justify-center text-sm text-[var(--themePrimary)] hover:underline"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4 transition-all duration-300 group-hover:-translate-x-1" />
                                Back to HRMS
                            </Link>
                        </FieldDescription>

                    </form>

                </div>
            </main>
        </div>
    );
};

export default Signin;


