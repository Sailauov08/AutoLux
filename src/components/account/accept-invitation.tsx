"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { FormAlert } from "@/components/forms/form-status";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { acceptInvitation } from "@/lib/actions/account";

export function AcceptInvitation({ token }: { token: string }) {
  const t = useTranslations("invite");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <Button
        variant="solid"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await acceptInvitation(token);
            if (result.ok) router.push("/admin");
            else setError(result.error);
          })
        }
      >
        {pending ? t("accepting") : t("accept")}
      </Button>
      <FormAlert code={error} />
    </div>
  );
}
