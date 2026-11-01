// Transactional test double; emulator/live tests are still needed for IAM and SDK behavior.
export function memoryFirestore() {
  const records = new Map();
  let sequence = 0;
  let pending = Promise.resolve();
  let writes = 0;
  const snapshot = (ref) => ({
    id: ref.id,
    exists: records.has(ref.path),
    data: () => structuredClone(records.get(ref.path))
  });
  function collection(name) {
    function query(field, value) {
      return {
        async get() {
          const docs = [...records.entries()]
            .filter(([path, data]) => path.startsWith(`${name}/`) && (!field || data[field] === value))
            .map(([path]) => snapshot({ path, id: path.slice(name.length + 1) }));
          return { docs };
        }
      };
    }
    return {
      ...query(),
      doc(id = `generated-${++sequence}`) {
        const ref = { id, path: `${name}/${id}` };
        return { ...ref, get: async () => snapshot(ref) };
      },
      where(field, operator, value) {
        if (operator !== "==") throw new Error("Only equality is supported in this test double");
        return query(field, value);
      }
    };
  }
  return {
    collection,
    get writes() { return writes; },
    runTransaction(callback) {
      const result = pending.then(async () => {
        const changes = [];
        const value = await callback({
          get: async (ref) => snapshot(ref),
          set: (ref, data) => changes.push([ref.path, structuredClone(data)])
        });
        changes.forEach(([path, data]) => { records.set(path, data); writes++; });
        return value;
      });
      pending = result.catch(() => {});
      return result;
    }
  };
}
