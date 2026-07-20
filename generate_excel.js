import xlsx from 'xlsx';

const data = [
  { "Employee Name": "Alice Vance" },
  { "Employee Name": "Bob Miller" },
  { "Employee Name": "Charlie Green" },
  { "Employee Name": "Diana Prince" },
  { "Employee Name": "Ethan Hunt" },
  { "Employee Name": "Fiona Gallagher" },
  { "Employee Name": "George Clark" },
  { "Employee Name": "Hannah Abbott" }
];

const worksheet = xlsx.utils.json_to_sheet(data);
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, "Employees");

xlsx.writeFile(workbook, "./employees_sample.xlsx");
console.log("Generated employees_sample.xlsx successfully!");
