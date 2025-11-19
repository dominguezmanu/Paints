// public/js/reports.js
(function () {
  const Reports = {};

  Reports.initReportsView = function () {
    if (
      window.ReportsSales &&
      typeof ReportsSales.initReportsSalesView === "function"
    ) {
      ReportsSales.initReportsSalesView();
    } else {
      console.warn(
        "ReportsSales.initReportsSalesView no está definido. Revisa que reportsSales.js se haya cargado después de app.js."
      );
    }
  };

  window.Reports = Reports;
})();
