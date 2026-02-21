interface Props {
  title: string;
}

export default function SectionTitle({ title }: Props) {
  return (
    <h2 className="text-lg font-semibold mb-4 border-b pb-2">
      {title}
    </h2>
  );
}
