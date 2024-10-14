import { lazy } from "react";
import { Route, Router, Switch } from "wouter";

const IndexPage = lazy(() => import("./pages/index"));
const LoginPage = lazy(() => import("./pages/auth/login"));
const RegisterPage = lazy(() => import("./pages/auth/register"));
const ConfirmEmailPage = lazy(() => import("./pages/auth/confirm-email"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/forgot-password"));
const ResetPasswordPage = lazy(() => import("./pages/auth/reset-password"));
const ConferencePage = lazy(
  () => import("./pages/courses/conferences/[conferenceId]"),
);
const CoursePage = lazy(() => import("./pages/courses/[courseId]"));
const NotFoundPage = lazy(() => import("./pages/404"));

export default function Routes() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={IndexPage} />
        <Route path="/courses/:courseId" nest>
          <Route path="/" component={CoursePage} />
          <Route path="/conferences/:conferenceId" component={ConferencePage} />
        </Route>
        <Route path="/auth" nest>
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/confirm-email" component={ConfirmEmailPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
        </Route>
        <Route component={NotFoundPage} />
      </Switch>
    </Router>
  );
}
