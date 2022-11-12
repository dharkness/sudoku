import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";

import { trpc } from "../../utils/trpc";

import PlayPuzzle from "../../components/PlayPuzzle";

const ViewPuzzle: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  if (typeof router.query.id !== "string") {
    return <div>Cannot view multiple puzzles</div>;
  }

  const query = trpc.useQuery([
    "puzzle.get",
    { id: parseInt(router.query.id) },
  ]);

  if (query.error) {
    return (
      <div>
        Error loading puzzle {id}: {query.error.message}
      </div>
    );
  }
  if (!query.data) {
    return <div>Loading...</div>;
  }

  const puzzle = query.data.puzzle;

  return (
    <>
      <Head>
        <title>Sudoku Puzzle #{id}</title>
        <meta name="description" content={`Sudoku puzzle #${id}`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col items-center justify-center min-h-screen p-10 px-0 mx-auto md:py-20 md:p-10 md:px-0">
        <h1 className="font-extrabold text-center text-7xl">
          Sudoku Puzzle #{id}
        </h1>

        <main className="mt-5">
          <PlayPuzzle start={puzzle.start} />
          <div className="text-slate-500">
            Created on {puzzle.createdAt.toLocaleString()}
          </div>
        </main>
      </div>
    </>
  );
};

export default ViewPuzzle;
