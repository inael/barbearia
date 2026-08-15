import fc from "fast-check";

// Determinismo dos testes property: seed fixa + numRuns explicito.
// Sem isso o fast-check sorteia uma seed nova a cada execucao, o que deixa o
// suite nao-deterministico e chegou a abortar o dry-run do Stryker (mutation)
// numa seed "ruim". Fixar a seed torna o gate reproduzivel.
fc.configureGlobal({ seed: 0x1337beef, numRuns: 300 });
