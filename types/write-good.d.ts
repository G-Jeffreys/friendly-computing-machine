declare module "write-good" {
  interface WriteGoodSuggestion {
    index: number
    offset: number
    reason: string
  }
  function writeGood(text: string): WriteGoodSuggestion[]
  export = writeGood
}
