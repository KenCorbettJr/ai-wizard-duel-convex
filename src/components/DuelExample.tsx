import Image from "next/image";

interface DuelExampleProps {
  imageUrl: string;
  description: string;
}

export default function DuelExample({
  imageUrl,
  description,
}: DuelExampleProps) {
  return (
    <div className="relative">
      <div className="relative h-64 md:h-80 rounded-lg overflow-hidden shadow-lg">
        <Image src={imageUrl} alt={description} fill className="object-cover" />
      </div>
      <p className="text-sm text-muted-foreground text-center mt-2 italic">
        {description}
      </p>
    </div>
  );
}
