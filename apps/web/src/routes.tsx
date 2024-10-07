import { Route, Switch } from "wouter";
import IndexPage from "./pages";

export default function Routes() {
  return (
    <Switch>
      <Route path="/" component={IndexPage} />
    </Switch>
  );
}
