import { useDb } from '~/server/db/client'

/**
 * POST /api/accuracy-tests
 * Called by LabVIEW after an accuracy measurement run.
 * Creates the accuracy_tests header row + all accuracy_test_points rows.
 *
 * Body mirrors the LabVIEW accuracy JSON output:
 * {
 *   resultId         : number   (FK → test_results.id)
 *   deviceUnderTest  : { DUT, Article_Number, Revision, Serial_Number, DUT_SW_Version }
 *   interfaceDetails : { Channel, Declared_Class, Frequency, Vnp, Inp, Vns, Ins,
 *                        Measure_Period, Global_KV, Global_KI }
 *   referenceInstrument : { Model, SerialNumber, Calibration_Date, Calibration_Due_Date }
 *   testInformation  : { Test_SW_Version, Start_Time, End_Time, Execution_time, Test_Result }
 *   testResults      : [{
 *     ID, AREA, Energy_Type, Vs, Is, PF,
 *     Vs_Reading_[V], Is_Reading_[A], Active_Energy_Reading_[Wh], PF_Calculated,
 *     Reference_Energy, Reading_ID, DUT_Energy,
 *     Error_Limit_[EL], Overall_Uncertainty_[UO], Overall_Instruments_Error_[EI],
 *     Applied_Limit_[EL-UO-EI], DUT_Error, Result
 *   }]
 *   testNotes        : string[]
 * }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    resultId           : number
    deviceUnderTest    : Record<string, string>
    interfaceDetails   : Record<string, string>
    referenceInstrument: Record<string, string>
    testInformation    : Record<string, string>
    testResults        : Array<Record<string, string>>
    testNotes?         : string[]
  }>(event)

  if (!body?.resultId) {
    throw createError({ statusCode: 400, message: 'resultId is required' })
  }

  const sql = useDb()
  const d   = body.deviceUnderTest     ?? {}
  const ifc = body.interfaceDetails    ?? {}
  const ref = body.referenceInstrument ?? {}
  const ti  = body.testInformation     ?? {}

  const headerRow = {
    result_id               : body.resultId,
    // DUT
    dut_name                : d['DUT']              ?? null,
    dut_article_number      : d['Article_Number']   ?? null,
    dut_revision            : d['Revision']         ?? null,
    dut_serial_number       : d['Serial_Number']    ?? null,
    dut_sw_version          : d['DUT_SW_Version']   ?? null,
    // Interface
    channel                 : ifc['Channel']        ?? null,
    declared_class          : ifc['Declared_Class'] ?? null,
    frequency               : ifc['Frequency']      ?? null,
    vnp                     : ifc['Vnp']            ?? null,
    inp                     : ifc['Inp']            ?? null,
    vns                     : ifc['Vns']            ?? null,
    ins                     : ifc['Ins']            ?? null,
    measure_period          : ifc['Measure_Period'] ?? null,
    global_kv               : ifc['Global_KV']      ?? null,
    global_ki               : ifc['Global_KI']      ?? null,
    // Reference instrument
    ref_model               : ref['Model']                  ?? null,
    ref_serial_number       : ref['SerialNumber']           ?? null,
    ref_calibration_date    : ref['Calibration_Date']       ?? null,
    ref_calibration_due     : ref['Calibration_Due_Date']   ?? null,
    // Test information
    test_sw_version         : ti['Test_SW_Version']  ?? null,
    test_start_time         : ti['Start_Time']       ?? null,
    test_end_time           : ti['End_Time']         ?? null,
    execution_time          : ti['Execution_time']   ?? null,
    test_result             : ti['Test_Result']      ?? null,
    // Notes
    test_notes              : body.testNotes ? sql.json(body.testNotes) : null,
  }

  const [at] = await sql`
    INSERT INTO accuracy_tests ${sql(headerRow)}
    RETURNING id
  `

  if (body.testResults?.length) {
    const pointRows = body.testResults.map((p, i) => ({
      accuracy_test_id       : at.id,
      point_id               : p['ID']                          ?? null,
      area                   : p['AREA']                        ?? null,
      energy_type            : p['Energy_Type']                 ?? null,
      vs_pct                 : p['Vs']                          ?? null,
      is_pct                 : p['Is']                          ?? null,
      pf                     : p['PF']                          ?? null,
      vs_reading             : p['Vs_Reading_[V]']              ?? null,
      is_reading             : p['Is_Reading_[A]']              ?? null,
      active_energy_reading  : p['Active_Energy_Reading_[Wh]']  ?? null,
      pf_calculated          : p['PF_Calculated']               ?? null,
      reference_energy       : p['Reference_Energy']            ?? null,
      reading_id             : p['Reading_ID']                  ?? null,
      dut_energy             : p['DUT_Energy']                  ?? null,
      error_limit            : p['Error_Limit_[EL]']            ?? null,
      overall_uncertainty    : p['Overall_Uncertainty_[UO]']    ?? null,
      overall_instruments_err: p['Overall_Instruments_Error_[EI]'] ?? null,
      applied_limit          : p['Applied_Limit_[EL-UO-EI]']   ?? null,
      dut_error              : p['DUT_Error']                   ?? null,
      result                 : p['Result']                      ?? null,
      sort_order             : i,
    }))
    await sql`INSERT INTO accuracy_test_points ${sql(pointRows)}`
  }

  return { id: String(at.id) }
})
