import type { NextPage } from "next";
import Head from "next/head";
import { trpc } from "../utils/trpc";

const Home: NextPage = () => {
  const hello = trpc.useQuery(["puzzle.getAll"]);

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
        <h1 className="font-extrabold text-center text-7xl">
          Create <span className="text-blue-500">T3</span> App
        </h1>

        <h3 className="items-center m-5 text-3xl">This stack uses:</h3>

        <main className="grid items-start grid-cols-1 gap-10 p-5 md:p-0 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ">
          <section className="h-full max-h-72 transform group border-2 border-neutral-800 rounded-2xl duration-300 hover:scale-105 hover:border-blue-600 hover:-translate-y-1 hover:shadow-2xl">
            <a href="https://nextjs.org/" target="_blank" rel="noreferrer">
              <div className="p-5 py-10 flex flex-col justify-center h-full text-center">
                <h2 className="mb-5 text-3xl">NextJS</h2>
                <p className="mb-5">The React framework for production</p>
                <button className="p-2 px-6 w-fit self-center text-white font-bold bg-blue-500 rounded-full group-hover:bg-blue-600 duration-300">
                  Documentation
                </button>
              </div>
            </a>
          </section>

          <section className="h-full max-h-72 transform group border-2 border-neutral-800 rounded-2xl duration-300 hover:scale-105 hover:border-blue-600 hover:-translate-y-1 hover:shadow-2xl">
            <a
              href="https://www.typescriptlang.org/"
              target="_blank"
              rel="noreferrer"
            >
              <div className="p-5 py-10 flex flex-col justify-center h-full text-center">
                <h2 className="mb-5 text-3xl">TypeScript</h2>
                <p className="mb-5">
                  Strongly typed programming language that builds on JavaScript,
                  giving you better tooling at any scale
                </p>
                <button className="p-2 px-6 w-fit self-center text-white font-bold bg-blue-500 rounded-full group-hover:bg-blue-600 duration-300">
                  Documentation
                </button>
              </div>
            </a>
          </section>

          <section className="h-full max-h-72 transform group border-2 border-neutral-800 rounded-2xl duration-300 hover:scale-105 hover:border-blue-600 hover:-translate-y-1 hover:shadow-2xl">
            <a href="https://tailwindcss.com/" target="_blank" rel="noreferrer">
              <div className="p-5 py-10 flex flex-col justify-center h-full text-center">
                <h2 className="mb-5 text-3xl">TailwindCSS</h2>
                <p className="mb-5">
                  Rapidly build modern websites without ever leaving your HTML
                </p>
                <button className="p-2 px-6 w-fit self-center text-white font-bold bg-blue-500 rounded-full group-hover:bg-blue-600 duration-300">
                  Documentation
                </button>
              </div>
            </a>
          </section>

          <section className="h-full max-h-72 transform group border-2 border-neutral-800 rounded-2xl duration-300 hover:scale-105 hover:border-blue-600 hover:-translate-y-1 hover:shadow-2xl">
            <a href="https://trpc.io/" target="_blank" rel="noreferrer">
              <div className="p-5 py-10 flex flex-col justify-center h-full text-center">
                <h2 className="mb-5 text-3xl">tRPC</h2>
                <p className="mb-5">End-to-end typesafe APIs made easy</p>
                <button className="p-2 px-6 w-fit self-center text-white font-bold bg-blue-500 rounded-full group-hover:bg-blue-600 duration-300">
                  Documentation
                </button>
              </div>
            </a>
          </section>
        </main>

        <div className="py-6 text-2xl text-blue-500">
          {hello.data ? (
            <ul>
              {hello.data.map((puzzle) => (
                <li key={puzzle.hash}>
                  <a href={`/puzzle/${puzzle.id}`}>
                    {puzzle.id}: {puzzle.createdAt.toLocaleString()}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>Loading..</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
