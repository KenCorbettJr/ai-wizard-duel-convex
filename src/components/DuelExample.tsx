import Image from "next/image";

interface DuelExampleProps {
  imageUrl: string;
  description: string;
  captionClassName?: string;
}

export default function DuelExample({
  imageUrl,
  description,
  captionClassName = "text-muted-foreground",
}: DuelExampleProps) {
  return (
    <div className="relative">
      <div className="relative h-64 md:h-80 rounded-lg overflow-hidden shadow-lg">
        <Image
          src={imageUrl}
          alt={description}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <p className={`text-sm text-center mt-2 italic ${captionClassName}`}>
        {description}
      </p>
    </div>
  );
}
