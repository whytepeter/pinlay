<script setup lang="ts">
/**
 * Terms of Service — /terms. Public route.
 *
 * Scoped to what pinlay actually is today: a hosted, multi-tenant service
 * with accounts, workspaces and a browser extension. Deliberately does NOT
 * assert a paid-plan contract — billing is still placeholder in the product
 * (features/settings/components/BillingSection.vue), so the payment section
 * describes the terms that will apply *if and when* a paid plan is taken,
 * rather than implying one exists.
 */
import LegalLayout from "./LegalLayout.vue";
import { ENTITY, LEGAL_EMAIL, SECURITY_EMAIL } from "./legal-meta";
</script>

<template>
  <LegalLayout
    title="Terms of Service"
    intro="The agreement between you and pinlay. Plain language, and shorter than it could have been."
  >
    <h2>Agreement</h2>
    <p>
      These terms are an agreement between you and {{ ENTITY }} covering your
      use of pinlay — the web dashboard, the API, and the browser extension. By
      creating an account or using the service, you accept them. If you are
      accepting on behalf of a company, you confirm you are authorised to bind
      it.
    </p>

    <h2>Your account</h2>
    <p>
      You need an account to use pinlay. Give accurate information, keep your
      password to yourself, and tell us promptly at
      <a :href="`mailto:${SECURITY_EMAIL}`">{{ SECURITY_EMAIL }}</a> if you
      think it has been compromised. You are responsible for what happens under
      your account.
    </p>
    <p>
      You must be at least 16 years old, and legally able to enter into this
      agreement.
    </p>

    <h2>Workspaces and shared content</h2>
    <p>
      Pins live inside a workspace and are visible to everyone in it. Inviting
      someone to a workspace gives them access to the pins in it, including
      screenshots. Think before you invite, and think before you pin something
      confidential.
    </p>
    <p>
      Workspace owners and administrators can remove members, delete content,
      and delete the workspace itself. If you are a member rather than an
      owner, your access can be ended by them at any time.
    </p>

    <h2>Acceptable use</h2>
    <p>You agree not to:</p>
    <ul>
      <li>
        use pinlay to capture content you have no right to capture, including
        another person's private information or a site you are not permitted to
        test;
      </li>
      <li>
        upload malware, or anything unlawful, harassing, or infringing of
        someone else's rights;
      </li>
      <li>
        attempt to break, overload, probe or circumvent the service's security
        or access controls, or access another workspace's data;
      </li>
      <li>
        resell or redistribute the service, or scrape it in bulk, without our
        written permission;
      </li>
      <li>use pinlay to build a competing product from our data.</li>
    </ul>
    <p>
      Note that pinlay lets you capture screenshots of pages you visit. Whether
      you are entitled to capture and share a given page is your
      responsibility, not ours — particularly for pages behind a login, or
      containing other people's personal data.
    </p>

    <h2>Your content</h2>
    <p>
      Your pins, comments and screenshots remain yours. You grant us only the
      permission we need to operate the service: to store that content, and to
      display it to the members of your workspace. We do not use it to train
      models, and we do not publish it.
    </p>
    <p>
      You are responsible for having the right to upload what you upload. We
      may remove content that breaches these terms.
    </p>

    <h2>Our content</h2>
    <p>
      The pinlay software, name, and design remain ours. These terms give you
      permission to use the service, not ownership of it.
    </p>

    <h2>Paid plans</h2>
    <p>
      pinlay may offer paid plans. Where you take one, fees are stated at the
      point of purchase and charged in advance for the billing period you
      choose. Unless the law requires otherwise, payments are non-refundable
      for the period already started. You can cancel at any time, and the
      cancellation takes effect at the end of the current period. We will give
      reasonable notice before changing a price that applies to you.
    </p>

    <h2>Availability</h2>
    <p>
      We aim to keep pinlay running and will not be careless about it, but we
      do not promise uninterrupted availability. We may change, suspend or
      discontinue features. If we discontinue the service altogether, we will
      give you reasonable notice and a way to export your data.
    </p>

    <h2>Ending the agreement</h2>
    <p>
      You may stop using pinlay and delete your account at any time from your
      settings. We may suspend or terminate your access if you materially
      breach these terms, or if we are required to by law — in serious cases
      without prior notice. On termination, your right to use the service ends
      and your data is deleted as described in our Privacy Policy.
    </p>

    <h2>Disclaimers</h2>
    <p>
      The service is provided "as is" and "as available". To the fullest extent
      permitted by law, we disclaim implied warranties of merchantability,
      fitness for a particular purpose, and non-infringement. We do not warrant
      that the service will be error-free, or that pins will always resolve to
      the correct element on a page that has since changed.
    </p>

    <h2>Limitation of liability</h2>
    <p>
      To the fullest extent permitted by law, we are not liable for indirect,
      incidental, special or consequential damages, or for lost profits, lost
      revenue, or lost data. Our total liability arising out of or relating to
      the service is limited to the greater of the amount you paid us in the
      twelve months before the claim, or one hundred US dollars.
    </p>
    <p>
      Nothing in these terms excludes liability that cannot lawfully be
      excluded — including for death or personal injury caused by negligence,
      or for fraud. Some jurisdictions do not allow certain exclusions, in
      which case those exclusions do not apply to you.
    </p>

    <h2>Indemnity</h2>
    <p>
      You agree to indemnify us against claims arising from your use of the
      service in breach of these terms, or from content you uploaded that you
      had no right to upload.
    </p>

    <h2>Changes to these terms</h2>
    <p>
      We may update these terms. If a change is material we will update the
      effective date above and give notice in the product or by email before it
      takes effect. Continuing to use pinlay after that means you accept the
      new terms; if you do not, stop using the service and delete your account.
    </p>

    <h2>Contact</h2>
    <p>
      Questions about these terms go to
      <a :href="`mailto:${LEGAL_EMAIL}`">{{ LEGAL_EMAIL }}</a>.
    </p>
  </LegalLayout>
</template>
