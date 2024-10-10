import { lazy } from "react";
import { Route } from "wouter";

const IndexPage = lazy(() => import("./pages/index"));
const LoginPage = lazy(() => import("./pages/auth/login"));
const RegisterPage = lazy(() => import("./pages/auth/register"));
const ConfirmEmailPage = lazy(() => import("./pages/auth/confirm-email"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/forgot-password"));
const ResetPasswordPage = lazy(() => import("./pages/auth/reset-password"));
const WorkspacePage = lazy(() => import("./pages/workspace/[id]"));
const CoursePage = lazy(() => import("./pages/courses/[id]"));

export default function Routes() {
  return (
    <>
      <Route path="/" component={IndexPage} />
      <Route path="/courses/:id" component={CoursePage} />
      <Route path="/auth" nest>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/confirm-email" component={ConfirmEmailPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
      </Route>
      <Route path="/workspace/:id" component={WorkspacePage} />
    </>
  );
}
