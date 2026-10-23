import DrawTool from "./DrawTool";
import Gallery from "./Gallery";
import { getTodaysGallery } from "./actions";

export const dynamic = "force-dynamic";

export default async function DrawPage() {
  const gallery = await getTodaysGallery();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Draw for the background</h1>
      <p className="mb-6 text-sm text-black/50 dark:text-white">
        You get one minute and one chalk color. Your drawing floats around behind every page for everyone, until
        midnight UTC, when today&apos;s set resets. Make as many as you want, and keep them friendly.
      </p>
      <DrawTool />

      <h2 className="mt-10 mb-3 text-lg font-semibold">Today&apos;s drawings</h2>
      <Gallery drawings={gallery} />
    </div>
  );
}
