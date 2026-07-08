"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinGroup, leaveGroup } from "@/app/groups/actions";
import { Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface JoinGroupButtonProps {
  groupId: string;
  groupSlug: string;
  initialIsMember: boolean;
  isAuthenticated: boolean;
  className?: string;
}

export function JoinGroupButton({
  groupId,
  groupSlug,
  initialIsMember,
  isAuthenticated,
  className,
}: JoinGroupButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMember, setIsMember] = useState(initialIsMember);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleClick() {
    if (!isAuthenticated) {
      router.push(`/sign-in?redirectTo=/groups/${groupSlug}`);
      return;
    }

    setErrorMsg(null);
    const nextMember = !isMember;
    setIsMember(nextMember);

    startTransition(async () => {
      const result = await (nextMember ? joinGroup(groupId) : leaveGroup(groupId));
      if (result.error) {
        setIsMember(!nextMember);
        setErrorMsg(result.error);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          isMember
            ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            : "bg-brand text-white hover:bg-brand/90",
          className
        )}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Users className="h-4 w-4" />
        )}
        {isMember ? "Leave group" : "Join group"}
      </button>
      {errorMsg && (
        <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
