export async function runWithConcurrency(
  tasks: Array<() => Promise<void>>,
  limit: number,
  isCancelled: () => boolean = () => false
): Promise<void> {
  if (tasks.length === 0) {
    return
  }

  let index = 0
  const workerCount = Math.min(Math.max(1, limit), tasks.length)

  const workers = Array.from({ length: workerCount }, async () => {
    while (index < tasks.length) {
      if (isCancelled()) {
        return
      }
      const current = index++
      await tasks[current]()
    }
  })

  await Promise.all(workers)
}
