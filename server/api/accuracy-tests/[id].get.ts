import { useDb } from '~/server/db/client'

/**
 * GET /api/accuracy-tests/:id
 * Returns full accuracy test header + all measurement points.
 */
export default defineEventHandler(async (event) => {
  const id  = Number(getRouterParam(event, 'id'))
  const sql = useDb()

  const [at] = await sql`SELECT * FROM accuracy_tests WHERE id = ${id}`
  if (!at) throw createError({ statusCode: 404, message: 'Accuracy test not found' })

  const points = await sql`
    SELECT * FROM accuracy_test_points
    WHERE accuracy_test_id = ${id}
    ORDER BY sort_order, id
  `

  return {
    id                  : String(at.id),
    resultId            : String(at.result_id),
    deviceUnderTest: {
      dut             : at.dut_name,
      articleNumber   : at.dut_article_number,
      revision        : at.dut_revision,
      serialNumber    : at.dut_serial_number,
      swVersion       : at.dut_sw_version,
    },
    interfaceDetails: {
      channel         : at.channel,
      declaredClass   : at.declared_class,
      frequency       : at.frequency,
      vnp             : at.vnp,
      inp             : at.inp,
      vns             : at.vns,
      ins             : at.ins,
      measurePeriod   : at.measure_period,
      globalKv        : at.global_kv,
      globalKi        : at.global_ki,
    },
    referenceInstrument: {
      model           : at.ref_model,
      serialNumber    : at.ref_serial_number,
      calibrationDate : at.ref_calibration_date,
      calibrationDue  : at.ref_calibration_due,
    },
    testInformation: {
      swVersion       : at.test_sw_version,
      startTime       : at.test_start_time,
      endTime         : at.test_end_time,
      executionTime   : at.execution_time,
      testResult      : at.test_result,
    },
    testNotes           : at.test_notes ?? [],
    createdAt           : at.created_at,
    points: points.map(p => ({
      id                    : String(p.id),
      pointId               : p.point_id,
      area                  : p.area,
      energyType            : p.energy_type,
      vsPct                 : p.vs_pct,
      isPct                 : p.is_pct,
      pf                    : p.pf,
      vsReading             : p.vs_reading,
      isReading             : p.is_reading,
      activeEnergyReading   : p.active_energy_reading,
      pfCalculated          : p.pf_calculated,
      referenceEnergy       : p.reference_energy,
      readingId             : p.reading_id,
      dutEnergy             : p.dut_energy,
      errorLimit            : p.error_limit,
      overallUncertainty    : p.overall_uncertainty,
      overallInstrumentsErr : p.overall_instruments_err,
      appliedLimit          : p.applied_limit,
      dutError              : p.dut_error,
      result                : p.result,
    })),
  }
})
