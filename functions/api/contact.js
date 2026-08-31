const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

const clean = (value, max = 500) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const escapeHtml = (value) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character],
  );

export async function onRequestPost({ request, env }) {
  try {
    if (!env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return json({ error: "Email service is not configured." }, 500);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > 12_000) {
      return json({ error: "Submission is too large." }, 413);
    }

    const body = await request.json();

    // Honeypot: real users never see or complete this field.
    if (clean(body.company, 100)) {
      return json({ ok: true });
    }

    const name = clean(body.name, 100);
    const email = clean(body.email, 200).toLowerCase();
    const phone = clean(body.phone, 40);
    const path = clean(body.path, 100);
    const goal = clean(body.goal, 150);
    const details = clean(body.details, 1200);
    const consent = body.consent === true;

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !validEmail || !path || !goal || !consent) {
      return json(
        {
          error:
            "Please complete your name, email, request type, and contact consent.",
        },
        400,
      );
    }

    const subject = `New OpenFootLab request — ${goal}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#18332c">
        <h1 style="font-family:Georgia,serif;font-weight:400">
          New OpenFootLab request
        </h1>

        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:10px;border-bottom:1px solid #d7ddd8"><strong>Name</strong></td>
            <td style="padding:10px;border-bottom:1px solid #d7ddd8">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding:10px;border-bottom:1px solid #d7ddd8"><strong>Email</strong></td>
            <td style="padding:10px;border-bottom:1px solid #d7ddd8">${escapeHtml(email)}</td>
          </tr>
          <tr>
            <td style="padding:10px;border-bottom:1px solid #d7ddd8"><strong>Phone</strong></td>
            <td style="padding:10px;border-bottom:1px solid #d7ddd8">${escapeHtml(phone || "Not provided")}</td>
          </tr>
          <tr>
            <td style="padding:10px;border-bottom:1px solid #d7ddd8"><strong>Request for</strong></td>
            <td style="padding:10px;border-bottom:1px solid #d7ddd8">${escapeHtml(path)}</td>
          </tr>
          <tr>
            <td style="padding:10px;border-bottom:1px solid #d7ddd8"><strong>Goal</strong></td>
            <td style="padding:10px;border-bottom:1px solid #d7ddd8">${escapeHtml(goal)}</td>
          </tr>
        </table>

        <h2 style="font-family:Georgia,serif;font-weight:400">General message</h2>
        <p style="line-height:1.6;white-space:pre-wrap">${escapeHtml(details || "No message provided.")}</p>

        <p style="font-size:12px;color:#66766f">
          Submitted through the OpenFootLab website. Reply directly to this email
          to contact the sender.
        </p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          env.CONTACT_FROM_EMAIL ||
          "OpenFootLab Website <forms@openfootlab.com>",
        to: [env.CONTACT_TO_EMAIL || "care@openfootlab.com"],
        reply_to: email,
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      console.error(
        "Resend request failed",
        resendResponse.status,
        await resendResponse.text(),
      );

      return json(
        {
          error:
            "We could not send your request. Please email care@openfootlab.com.",
        },
        502,
      );
    }

    return json({ ok: true });
  } catch (error) {
    console.error("Contact function failed", error);

    return json(
      {
        error:
          "We could not send your request. Please email care@openfootlab.com.",
      },
      500,
    );
  }
}

export function onRequestGet() {
  return json({ error: "Method not allowed." }, 405);
}
