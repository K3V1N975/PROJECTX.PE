const STORAGE_KEY = "projectx_fiesta_lista";
let lista = [];
let editId = null;

function cargar() {
  const raw = localStorage.getItem(STORAGE_KEY);
  lista = raw ? JSON.parse(raw) : [];
}

function guardar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function render() {
  const tbody = document.querySelector("#tabla tbody");
  tbody.innerHTML = "";
  lista.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nombres}</td>
      <td>${item.apellidos}</td>
      <td>${item.dni}</td>
      <td>${item.telefono}</td>
      <td>${item.correo}</td>
      <td>${item.edad}</td>
      <td>
        <button data-id="${item.id}" class="editar">Editar</button> 
        <button data-id="${item.id}" class="borrar danger">Borrar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  
  const nombres = document.getElementById("nombres").value.trim();
  const apellidos = document.getElementById("apellidos").value.trim();
  const dni = document.getElementById("dni").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const edad = parseInt(document.getElementById("edad").value, 10);

  if (!nombres || !apellidos || !dni || !telefono || !correo || !edad) {
    showToast('Por favor completa todos los campos', 'error');
    return;
  }

  // Basic validation
  if (dni.length < 8) {
    showToast('El DNI debe tener al menos 8 dígitos', 'error');
    return;
  }
  
  // Set loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="loading-spinner"></div> Enviando...';

  // Optimistic UI update
  if (editId) {
    const idx = lista.findIndex((x) => x.id === editId);
    if (idx !== -1) {
      lista[idx] = { ...lista[idx], nombres, apellidos, dni, telefono, correo, edad };
    }
    editId = null;
    submitBtn.innerHTML = originalBtnText; // Restore immediately if editing locally
    submitBtn.disabled = false;
  } else {
    // New entry
    const newItem = { id: Date.now().toString(), nombres, apellidos, dni, telefono, correo, edad };
    lista.push(newItem);
    
    // Only send email for new registrations
    fetch("http://localhost:3000/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombres, apellidos, dni, telefono, correo, edad }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) {
          showToast("Registro guardado, pero no se pudo enviar el correo", "error");
        } else if (d.preview) {
          showToast("Registro exitoso. Correo de prueba enviado.", "success");
          console.log("Preview URL: " + d.preview);
        } else {
          showToast("Registro exitoso y correo enviado", "success");
        }
      })
      .catch(() => {
        showToast("Error de conexión con el servidor de correos", "error");
      })
      .finally(() => {
        if (!editId) { // Only reset if not in edit mode (though editId is null here)
             submitBtn.innerHTML = originalBtnText;
             submitBtn.disabled = false;
        }
      });
  }
  
  guardar();
  render();
  form.reset();
}

function toCSVRow(values) {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      const needsQuotes = /[",\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    })
    .join(",");
}

function toCSV(arr) {
  const header = toCSVRow(["Nombres", "Apellidos", "DNI", "Telefono", "Correo", "Edad"]);
  const rows = arr.map((x) => toCSVRow([x.nombres, x.apellidos, x.dni, x.telefono, x.correo, x.edad]));
  return [header, ...rows].join("\n");
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
  cargar();
  render();
  document.getElementById("form").addEventListener("submit", onSubmit);
  
  document.querySelector("#tabla").addEventListener("click", (e) => {
    const id = e.target.getAttribute("data-id");
    if (!id) return;
    
    if (e.target.classList.contains("borrar")) {
      if(confirm('¿Estás seguro de eliminar este registro?')) {
        const idx = lista.findIndex((x) => x.id === id);
        if (idx !== -1) {
          lista.splice(idx, 1);
          guardar();
          render();
          showToast('Registro eliminado', 'info');
        }
      }
    } else if (e.target.classList.contains("editar")) {
      const item = lista.find((x) => x.id === id);
      if (item) {
        document.getElementById("nombres").value = item.nombres;
        document.getElementById("apellidos").value = item.apellidos;
        document.getElementById("dni").value = item.dni;
        document.getElementById("telefono").value = item.telefono;
        document.getElementById("correo").value = item.correo;
        document.getElementById("edad").value = item.edad;
        editId = id;
        showToast('Editando registro... Modifica y haz clic en Enviar', 'info');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  });

  document.getElementById("clearAll").addEventListener("click", () => {
    if (confirm("¿Estás seguro de vaciar toda la lista?")) {
      lista = [];
      guardar();
      render();
      showToast('Lista vaciada correctamente', 'info');
    }
  });

  document.getElementById("exportCsv").addEventListener("click", () => {
    if (lista.length === 0) return showToast("La lista está vacía", "error");
    const csv = toCSV(lista);
    download("asistentes.csv", csv, "text/csv");
    showToast('Exportando CSV...', 'success');
  });

  document.getElementById("exportJson").addEventListener("click", () => {
    if (lista.length === 0) return showToast("La lista está vacía", "error");
    const json = JSON.stringify(lista, null, 2);
    download("asistentes.json", json, "application/json");
    showToast('Exportando JSON...', 'success');
  });
});