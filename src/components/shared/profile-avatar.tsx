import Image from "next/image";

import { cn } from "@/lib/utils";

type ProfileAvatarProps = {
  userId: string;
  fullName: string;
  avatarPath?: string | null;
  className?: string;
  imageClassName?: string;
};

export function ProfileAvatar({ userId, fullName, avatarPath, className, imageClassName }: ProfileAvatarProps) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.at(0))
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eef3dc] font-bold text-[#607800]",
        className,
      )}
    >
      {avatarPath ? (
        <Image
          alt={`Foto de ${fullName}`}
          className={cn("object-cover", imageClassName)}
          fill
          sizes="160px"
          src={`/api/profile-photos/${userId}`}
          unoptimized
        />
      ) : (
        initials
      )}
    </span>
  );
}
