import { createApp } from "vue";
import "@pinlay/design/tokens.css";
import "../../assets/style.css";
import App from "./App.vue";

const app = createApp(App);
// Render errors in a popup otherwise surface as an anonymous minified stack
// in chrome://extensions — log the component + lifecycle phase so field
// reports are actionable.
app.config.errorHandler = (err, instance, info) => {
  console.error(
    `[pinlay popup] error in <${instance?.$?.type?.__name ?? "anonymous"}> during ${info}:`,
    err,
  );
};
app.mount("#app");
