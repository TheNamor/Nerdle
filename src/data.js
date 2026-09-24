const API_BASE_URL = "https://nerdle-worker.thenamor2.workers.dev";

async function readResponse(res) {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        return {
            ok: false,
            error: data && (data.error || data.message) || "The request could not be completed."
        };
    }
    return { ok: true, data };
}

async function authenticate(path, email, password) {
    try {
        const res = await fetch(`${API_BASE_URL}/${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        return await readResponse(res);
    } catch (error) {
        return { ok: false, error: "Unable to reach the server. Please try again." };
    }
}

export async function registerUser(email, password) {
    const result = await authenticate("register", email, password);
    return result;
}

export async function loginUser(email, password) {
    const result = await authenticate("login", email, password);
    if (result.ok && result.data && result.data.token) {
        localStorage.setItem("nerdle_token", result.data.token);
    } else if (result.ok) {
        return { ok: false, error: "The server did not return a login token." };
    }
    return result;
}

export async function getSummary(token) {
    try {
        const res = await fetch(`${API_BASE_URL}/summary`, {
            method: "GET",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        });
        return await readResponse(res);

    } catch (error) {
        return { ok: false, error: error.message || "Unable to reach the server. Please try again." };
    }
}

export async function getPuzzle(token, day) {
    try {
        const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(day)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        });
        return await readResponse(res);

    } catch (error) {
        return { ok: false, error: error.message || "Unable to reach the server. Please try again." };
    }
}

export async function savePuzzle(token, puzzle) {
    try {
        const res = await fetch(`${API_BASE_URL}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(puzzle)
        });
        return await readResponse(res);

    } catch (error) {
        return { ok: false, error: error.message || "Unable to reach the server. Please try again." };
    }
}
