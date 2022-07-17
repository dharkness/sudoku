import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";

import SmallDotPuzzle from "../components/SmallDotPuzzle";
import { trpc } from "../utils/trpc";

const Home: NextPage = () => {
  const query = trpc.useQuery(["puzzle.getAll"]);

  return (
    <>
      <Head>
        <title>Sudoku</title>
        <meta
          name="description"
          content="Create and solve standard Sudoku puzzles"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container flex flex-col items-center justify-center min-h-screen p-10 px-0 mx-auto md:py-20 md:p-10 md:px-0">
        <h1 className="font-extrabold text-center text-7xl">Sudoku Puzzles</h1>

        <main className="mt-5">
          {query.data ? (
            <ul
              role="list"
              className="border rounded-lg border-slate-500 p-6 divide-y divide-slate-200"
            >
              {query.data.puzzles.map((puzzle) => (
                <li
                  key={puzzle.hash}
                  className="flex items-center py-4 first:pt-0 last:pb-0"
                >
                  <SmallDotPuzzle puzzle={puzzle} size={120} />
                  <div className="flex-col pl-4">
                    <div>
                      <Link
                        href={`/puzzle/${puzzle.id}`}
                        className="text-lg hover:text-orange-500"
                      >
                        <a>{puzzle.hash}</a>
                      </Link>
                    </div>
                    <div className="text-slate-500">
                      Created on {puzzle.createdAt.toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>Loading..</p>
          )}
        </main>
      </div>
    </>
  );
};

export default Home;
