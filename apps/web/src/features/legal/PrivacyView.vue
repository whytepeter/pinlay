<script setup lang="ts">
/**
 * Privacy Policy — /privacy. Public route.
 *
 * This page is read by Chrome Web Store reviewers against the extension's
 * actual manifest (apps/extension/wxt.config.ts). Every claim here was
 * checked against the code; the two that matter most and are easy to get
 * wrong:
 *
 *  1. The content script runs on <all_urls> and, WHEN SIGNED IN, sends the
 *     hostname of each page you visit to GET /annotation/pins?host=… so the
 *     launcher can show a pin count (see entrypoints/content.ts). That is
 *     passive transmission and is disclosed as such — do not soften it.
 *  2. It sends `location.host` only, never the full URL. The full URL is
 *     stored only when the user actually creates a pin.
 *
 * If either behaviour changes, this page must change with it.
 */
import LegalLayout from "./LegalLayout.vue";
import {
  CONTACT_EMAIL,
  ENTITY,
  SECURITY_EMAIL,
  SUBPROCESSORS,
} from "./legal-meta";
</script>

<template>
  <LegalLayout
    title="Privacy Policy"
    intro="What pinlay collects, why, and what it never does. Written to be read, not to be survived."
  >
    <h2>The short version</h2>
    <p>
      pinlay is a tool for leaving feedback pins on live web pages. To do that
      it needs to know which page you are on and what you wrote. It does not
      build an advertising profile, does not sell data, and does not record
      your browsing in the background.
    </p>
    <p>
      There is one piece of passive collection you should know about, described
      in full below: while you are signed in, the browser extension checks the
      <strong>hostname</strong> of pages you visit so it can tell you whether
      your team already left pins there.
    </p>

    <h2>Who we are</h2>
    <p>
      pinlay is operated by {{ ENTITY }}. For any question about this policy or
      about your data, contact
      <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>.
    </p>

    <h2>What we collect</h2>

    <h3>Account information</h3>
    <p>
      When you create an account we store your name, email address, and a
      password hash. Passwords are hashed with bcrypt and are never stored or
      logged in readable form. If you upload a profile picture we store that
      image too.
    </p>

    <h3>Workspace information</h3>
    <p>
      Workspace names, the members belonging to them, member roles, and pending
      invitations. If you invite someone, we store the email address you
      entered in order to send and track that invitation.
    </p>

    <h3>Pins and their context</h3>
    <p>
      When you create a pin, we store what is needed to put it back in the same
      place later and to let your team act on it:
    </p>
    <ul>
      <li>the full address of the page you pinned, including path;</li>
      <li>
        technical details identifying the element you clicked — a CSS selector,
        stable attributes such as <code>id</code> or
        <code>data-testid</code>, and its position on screen;
      </li>
      <li>the comment, title, severity, type and labels you entered;</li>
      <li>
        any screenshot you chose to capture, including any region you cropped
        or drew on;
      </li>
      <li>replies and status changes made by you or your teammates.</li>
    </ul>
    <p>
      Screenshots are captured only when you explicitly press the camera
      control. The extension does not capture your screen at any other time.
    </p>

    <h3>Hostnames while signed in</h3>
    <p>
      This is the one form of collection that happens without a deliberate
      action from you, so it deserves a plain statement.
    </p>
    <p>
      While you are signed in to the extension, each page you load sends its
      hostname — for example <code>example.com</code> — to our API, so the
      launcher can show whether your workspace has pins on that site. We
      receive the hostname only. We do not receive the path, the query string,
      the page contents, or anything you type.
    </p>
    <p>
      While you are signed out, the extension makes no network requests at all.
      If you would rather it did not run on a given site, you can restrict its
      site access from your browser's extension settings, or sign out.
    </p>

    <h3>What we deliberately do not collect</h3>
    <ul>
      <li>No advertising or tracking cookies, and no third-party analytics.</li>
      <li>No keystroke, form-field, or password capture.</li>
      <li>No continuous screen or session recording.</li>
      <li>
        No reading of page content except the element you explicitly pin, and
        the screenshot you explicitly take.
      </li>
      <li>No selling or renting of personal data, in any circumstance.</li>
    </ul>

    <h2>Why we are allowed to hold it</h2>
    <p>
      We process this data to provide the service you asked for: storing your
      pins, showing them to the teammates you shared a workspace with, and
      keeping your account secure. Where the law requires a stated legal basis,
      ours is the performance of our agreement with you, and our legitimate
      interest in keeping the service working and secure.
    </p>

    <h2>Browser permissions, and why each is needed</h2>
    <ul>
      <li>
        <strong>Access to all websites</strong> — pins can be left on any page
        you choose, so the extension has to be able to run where you decide to
        use it. It does not act until you engage it, beyond the hostname check
        described above.
      </li>
      <li>
        <strong>Tabs</strong> — to read the address and title of the page you
        are pinning, so the pin can be attached to it.
      </li>
      <li>
        <strong>Scripting</strong> — to draw the pin overlay and composer onto
        the page.
      </li>
      <li>
        <strong>Storage</strong> — to keep your session token and interface
        preferences, such as where you dragged the launcher, on your own
        device.
      </li>
    </ul>

    <h2>Who else can see your data</h2>
    <p>
      Anything you pin is visible to the members of the workspace it belongs
      to. Choose your workspace members accordingly.
    </p>
    <p>
      Beyond that, we rely on the following infrastructure providers, each of
      which may process data on our behalf in order to run the service. We do
      not share data with anyone else, and we do not sell it.
    </p>
    <ul>
      <li v-for="s in SUBPROCESSORS" :key="s.name">
        <strong>{{ s.name }}</strong> — {{ s.purpose }}
        <a :href="s.url" target="_blank" rel="noopener noreferrer"
          >Privacy policy</a
        >.
      </li>
    </ul>
    <p>
      We may also disclose data if we are legally compelled to, or where it is
      necessary to investigate abuse or protect someone's safety.
    </p>

    <h2>Where data is held, and for how long</h2>
    <p>
      Data is stored on servers operated by the providers listed above, which
      may be located outside your country. We keep your data for as long as
      your account exists. Delete a pin and it is removed; delete your
      workspace or account and the associated data is removed with it. Backups
      and logs may lag behind that deletion by a short period before they age
      out.
    </p>

    <h2>Security</h2>
    <p>
      Traffic is encrypted in transit. Passwords are hashed with bcrypt. Access
      to a workspace's data is checked on every request, so a link alone is not
      enough to reach something you are not a member of. No system is perfectly
      secure, and we do not claim otherwise — if you find a weakness, please
      report it to
      <a :href="`mailto:${SECURITY_EMAIL}`">{{ SECURITY_EMAIL }}</a> and we
      will act on it.
    </p>

    <h2>Your rights</h2>
    <p>
      You can access and correct most of your information directly in your
      account settings. You may also ask us to export or delete your data, or
      object to how we are processing it. Write to
      <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a> and we will
      respond within 30 days. Depending on where you live, you may also have
      the right to complain to your national data protection authority.
    </p>

    <h2>Children</h2>
    <p>
      pinlay is a tool for professional teams and is not directed at children.
      We do not knowingly collect data from anyone under 16. If you believe a
      child has given us data, contact us and we will delete it.
    </p>

    <h2>Changes</h2>
    <p>
      If we change this policy in a way that materially affects you, we will
      update the effective date above and, where the change is significant,
      tell you in the product or by email. Continuing to use pinlay after a
      change means you accept the updated policy.
    </p>
  </LegalLayout>
</template>
