export type ModuleCfgGroup = 'hardware' | 'software'

export interface ModuleCfgItem {
  id: string
  group: ModuleCfgGroup
  title: string
  shortLabel: string
  sourcePath?: string
  summary: string
  config: Record<string, any>
}

export const moduleCfgItems: Record<ModuleCfgGroup, ModuleCfgItem[]> = {
  hardware: [
    {
      id: 'digital-io',
      group: 'hardware',
      title: 'Digital I/O',
      shortLabel: 'DIO / NI-USB6525',
      summary: 'Digital I/O activation and VISA resource settings.',
      config: {
        'Device active': false,
        'VISA resource': 'NI-USB6525',
        'Reset (True)': false,
        'ID Query (True)': true,
      },
    },
    {
      id: 'power-supply',
      group: 'hardware',
      title: 'Power Supply',
      shortLabel: 'PSU',
      summary: 'Power supply VISA target, settling times and output defaults.',
      config: {
        'Device active': true,
        'PSU parameters': {
          'Settling Time': {
            'Voltage (5ms)': 5,
            'Current (5ms)': 5,
          },
          'CurrentLimit': 0,
        },
        'VISA name': 'TCPIP0::192.168.128.10::inst0::INSTR',
        'Device power supply': {
          'Voltage': 24,
          'Current': 0.5,
        },
        'IP': '192.168.128.10',
      },
    },
    {
      id: 'dsp-registers',
      group: 'hardware',
      title: 'DSP Registers',
      shortLabel: 'DSP / TCP',
      summary: 'TCP endpoint and register offsets/gains for channels A and B.',
      config: {
        'IP String': '192.168.128.100',
        'TCP port': 1100,
        'timeout': 10000,
        'RTU? (FALSE: ETH)': false,
        'DSP registers index': {
          'Ch A': {
            'Offset': 0,
            'Gain DC': 4,
            'Gain AC16': 8,
            'Gain AC50': 12,
          },
          'Ch B': {
            'Offset': 2,
            'Gain DC': 6,
            'Gain AC16': 10,
            'Gain AC50': 14,
          },
          'C (Ch A)': {
            'Offset': 0,
            'Gain DC': 4,
            'Gain AC16': 8,
            'Gain AC50': 12,
          },
          'C (Ch B)': {
            'Offset': 2,
            'Gain DC': 6,
            'Gain AC16': 10,
            'Gain AC50': 14,
          },
        },
      },
    },
    {
      id: 'rem102-login',
      group: 'hardware',
      title: 'REM102 Login',
      shortLabel: 'REM102 / CGI',
      summary: 'REM102 network login, CGI endpoint and cookie names.',
      config: {
        'RM102_Login': {
          'IP No.': '192.168.128.1',
          'Login': {
            'username': 'Admin',
            'pwd': 'Adm1@Rem',
          },
        },
        'MPC105 CGI string': '/cgi-bin/mpc105.fcgi',
        'cookie list': ['CGIUSERLEVEL=', 'CGIUSERNAME='],
      },
    },
    {
      id: 'switch',
      group: 'hardware',
      title: 'Switch',
      shortLabel: 'Switch / RASBA-RAMBA',
      sourcePath: 'F:\\04_REMview_v3\\01_LabVIEWcode\\remview_v3\\REMview_v3\\Support\\modules_cfg\\Switch.json',
      summary: 'Digital switch routing, NI device mapping and startup safe states.',
      config: {
        'Device active': true,
        'RAMBA RASBA active': true,
        'DIO NI Device': 'NI_USB_DEV1',
        'DigInputs': 'NI_USB_DEV1/port1/line0:7',
        'DigOutputs': 'NI_USB_DEV1/port0/line0:7',
        'RASBA': {
          'Name': 'Dev1 USB-1024LS',
          'FactoryID': '01DDCFEE',
          'Task': 'Dev1/1stPortA/Do0:7, Dev1/1stPortB/Do0:7, Dev1/1stPortCL/Do0:3, Dev1/1stPortCH/Do0:3',
          'Ports lines labels': {
            'ColHdrString': ['Port', 'Setting', 'Description'],
            'ItemNames': [[]],
          },
          'SafeSettings': [],
        },
        'RAMBA': {
          'Name': 'Dev0 USB-1024LS',
          'FactoryID': '01D665C9',
          'Task': 'Dev0/1stPortA/Do0:7, Dev0/1stPortB/Do0:7, Dev0/1stPortCL/Do0:3, Dev0/1stPortCH/Do0:3',
          'Ports lines labels': {
            'ColHdrString': ['Port', 'Setting', 'Description'],
            'ItemNames': [[]],
          },
          'SafeSettings': [],
        },
        'DevStartSetup': {
          'REM102': {
            'RAMBA': [1],
            'RASBA': [8, 9, 17],
            'NI_USB': [3],
          },
          'RTP100': {
            'RAMBA': [1],
            'RASBA': [8, 9, 17],
            'NI_USB': [3],
          },
        },
      },
    },
    {
      id: 'wt3000',
      group: 'hardware',
      title: 'WT3000',
      shortLabel: 'WT3000',
      summary: 'WT3000 power analyzer network/VISA identity.',
      config: {
        'Device active': true,
        'VISA name': 'WT3000-91U208601',
        'IP': '192.168.128.5',
        'SerialNo': '91U208601',
      },
    },
    {
      id: 'gs820',
      group: 'hardware',
      title: 'GS820',
      shortLabel: 'GS820',
      summary: 'GS820 network settings and remote file directory.',
      config: {
        'Device active': true,
        'IP': '192.168.128.6',
        'VISA name': 'GS820',
        'list dir': 'GS820ROM/PROGRAM',
      },
    },
  ],
  software: [
    {
      id: 'gui',
      group: 'software',
      title: 'GUI',
      shortLabel: 'GUI.json',
      sourcePath: 'F:\\04_REMview_v3\\01_LabVIEWcode\\remview_v3\\REMview_v3\\Support\\modules_cfg\\GUI.json',
      summary: 'GUI resources, visible controls, step tables and cable prompts.',
      config: {
        'Top visible steps': 0,
        'ACTIONS': ['01_Start_up.png', '02_LOGIN_WAIT.png', '03A_REM102_READY.png', '03B_REM102_NOT_READY.png', '04_DB_Check.png', '04_DB_Check_ERROR.png'],
        'MSG': ['CONNECT REM102 ETH0 AND POWER CABLES AND PRESS BUTTON DEVICE', 'CONNECTING TO REM102 DEVICE', 'REM102 READY, PRESS CHECK DEVICE BUTTON', '03B_REM102_NOT_READY.png', 'READING DATA FROM HART DATABASE', '04_DB_Check_ERROR.png'],
        'STATUS visible controls': {
          'REM102': ['File', 'CINNAMON', 'HART', 'PSU', 'YKGS820', 'WT3000', 'Multim3446A', 'REM102', 'Serial'],
          'RTP100': ['File', 'CINNAMON', 'HART', 'PSU', 'DRTP', 'Multim3446A', 'RTP100'],
        },
        'TestSteps list': {
          ' Headers': {
            'REM102': ['Step', 'Details', 'Results'],
            'RTP100': ['Step', 'Details', 'Results RTP1', 'Results RTP2', 'Results RTP3'],
          },
          ' Widith': {
            'REM102': [500, 1070, 110],
            'RTP100': [500, 870, 110, 110, 110],
          },
        },
        'Hardware list': {
          ' Headers': {
            'REM102': ['Step', 'Details', 'Results'],
            'RTP100': ['Step', 'Details', 'Results RTP1', 'Results RTP2', 'Results RTP3'],
          },
          ' Widith': {
            'REM102': [500, 1070, 110],
            'RTP100': [500, 870, 110, 110, 110],
          },
        },
        'Docs to open': {
          'tag': ['WT3000'],
          'page': [0],
        },
        'SpecCable': [
          {
            'ArtNo': '5.6602.005/01',
            'Cable': '11.0064.109/03',
            'Image': 'A2C2.png',
            'Message': 'Swap cable A2 on ATE with cable A2/C2... No. 11.0064.109/03',
          },
        ],
      },
    },
    {
      id: 'data-proc',
      group: 'software',
      title: 'Data Processing',
      shortLabel: 'DataProc.json',
      sourcePath: 'F:\\04_REMview_v3\\01_LabVIEWcode\\remview_v3\\REMview_v3\\Support\\modules_cfg\\DataProc.json',
      summary: 'RTO filtering and numeric precision for generated results.',
      config: {
        'RTO steps filter': [
          {
            'Device': 'REM102',
            'CINN Name': '5.2901.046J01',
            'Revision': 'A00',
            'StepsRange': {
              'Start': '4.6',
              'End': '4.12',
            },
            'RTO_Marker': {
              'Col. index': 0,
              'Identifier': 'Ä‚â€šĂ‚Â§',
            },
            'Init report': ['Accuracy Class', 'Production RNT', 'Update RNT', 'DSP Firmware Version', 'Test Config', 'Fieldbus', 'Insulation (test group)', 'Insulation (test configuration)', 'Burn In'],
          },
        ],
        'Results precision': {
          'Energy ': {
            'DUT': 3,
            'Reference': 3,
          },
          'Applied Limit ': 6,
          'Error Perc': 3,
          'Reading ': {
            'Vs': 3,
            'Is': 3,
            'Pf': 3,
          },
        },
      },
    },
    {
      id: 'lib-bl30',
      group: 'software',
      title: 'LibBL30',
      shortLabel: 'LibBL30.json',
      sourcePath: 'F:\\04_REMview_v3\\01_LabVIEWcode\\remview_v3\\REMview_v3\\Support\\modules_cfg\\LibBL30.json',
      summary: 'BL30 init settings, REM102 connection and GS820 event defaults.',
      config: {
        'Init CFG': {
          'PolyDegree': 0,
          'Max_Cal_SetPoints': 0,
        },
        'ConnectREM102': {
          'IP (192.168.128.1)': '192.168.128.1',
          'portNo (6020)': 6020,
          'TimeOut (5000)': 5000,
        },
        'GS820 event (OnGenerateSignal )': {
          'return value': false,
          'Channel': 'A1',
          'nominalValue': 0,
          'percentOfNominal': 0,
          'frequency': 'AC50',
          'type': 'Voltage',
        },
        'Models.ini': [],
        'Instrument calibration': [],
      },
    },
    {
      id: 'file',
      group: 'software',
      title: 'File Paths',
      shortLabel: 'File.json',
      sourcePath: 'F:\\04_REMview_v3\\01_LabVIEWcode\\remview_v3\\REMview_v3\\Support\\modules_cfg\\File.json',
      summary: 'Support, results, logs, calibration and RTO data paths.',
      config: {
        'Support Dir': 'D:\\SVN\\trunk\\REMview3.0\\Support',
        'Results Dir': 'D:\\SVN\\trunk\\REMview3.0\\Support\\Results',
        'RTO dir': 'C:\\ProgramData\\HaslerRail\\REMview3.0\\01_RTO\\REM102',
        'REM102 RTO Doc Name': '5.2901.046J01',
        'Log buffer size': 5,
        'Log file path': 'C:\\ProgramData\\HaslerRail\\REMview3.0\\04_Logs\\REMview3.0_AppLog.txt',
        'UserProfiles Dir': 'C:\\ProgramData\\HaslerRail\\REMview3.0\\00_UserProfiles',
        'INI data dir': 'C:\\ProgramData\\HaslerRail\\REMview3.0\\02_Test_data\\Data',
        'Test_Modules': 'D:\\SVN\\trunk\\REMview3.0\\10_Test_Modules',
        'Test_Configurations': 'C:\\ProgramData\\HaslerRail\\REMview3.0\\02_Test_data\\Test_Configurations',
        'Calibration data': {
          'Shunt': 'C:\\ProgramData\\HaslerRail\\Calibration data\\Shunt_Calibration_Data.csv',
          'GS820': 'C:\\ProgramData\\HaslerRail\\Calibration data\\GS820_SN91H332693_Calibration_Data.csv',
          'WT3000': 'C:\\ProgramData\\HaslerRail\\Calibration data\\WT3000_SN91T416432_Calibration_Data.csv',
        },
        'GetDocPath': [],
        'RTO data filter': [
          {
            'StepsRange': {
              'Start': '4.6',
              'End': '4.11',
            },
            'RTO_Marker': {
              'Col. index': 0,
              'Identifier': 'Ä‚â€šĂ‚Â§',
            },
          },
          {
            'StepsRange': {
              'Start': '4.6',
              'End': '4.8',
            },
            'RTO_Marker': {
              'Col. index': 0,
              'Identifier': '',
            },
          },
          {
            'StepsRange': {
              'Start': '4.6',
              'End': '4.11',
            },
            'RTO_Marker': {
              'Col. index': 0,
              'Identifier': '',
            },
          },
        ],
        'Models ini path': 'C:\\ProgramData\\HaslerRail\\REMview3.0\\02_Test_data\\models.ini',
        'GS820_AC_Files dir': 'C:\\ProgramData\\HaslerRail\\REMview3.0\\02_Test_data\\GS820_AC_Files',
      },
    },
    {
      id: 'tests-dirs',
      group: 'software',
      title: 'Tests Directories',
      shortLabel: 'Tests Dirs',
      summary: 'Configured test module/config directories for RTP100 and REM102.',
      config: {
        'Tests Dirs RTP100': {
          'Modules': '',
          'Configs': '',
        },
        'Tests Dirs REM102': {
          'Modules': '',
          'Configs': '',
        },
      },
    },
    {
      id: 'reporting',
      group: 'software',
      title: 'Reporting',
      shortLabel: 'Reporting.json',
      sourcePath: 'F:\\04_REMview_v3\\01_LabVIEWcode\\remview_v3\\REMview_v3\\Support\\modules_cfg\\Reporting.json',
      summary: 'Report templates, buffer paths and bookmark mappings.',
      config: {
        'Paths': {
          'REM102': {
            'AccuracyTestReport.template': '5.2901.046Q02',
            'RoutineTestReport.template': '5.2901.046QEN',
            'CalibrationReport.template': '5.2901.046Q01',
            'Report.buffer': 'C:\\ProgramData\\HaslerRail\\REMview3.0\\03_Reports\\buffer',
          },
        },
        'BookmarkData': {
          'Product_ID': {
            'Mnemonic': 'product_id_mnemonic',
            'Type': 'product_id_type',
            'SN': 'product_id_sn',
            'Rev': 'product_id_revision',
            'Art.No': 'product_id_art_no',
          },
          'Test_equipment': {
            'Inv. Number ': '',
            'GS820': '',
            'WT3000E ': '',
            'N5750A ': '',
            'ISA DRTP': '',
            'DAQ': '',
          },
          'Certificate': {
            'Customer': {
              'Purchaser': 'cert_cust_purchaser',
              'Contract Order-No.': 'cert_cust_contr',
              'Project': 'cert_cust_project',
              'Customer-No.': 'cert_cust_cust_no',
            },
            'Supplier': {
              'Serial No.': 'cert_supp_ser_no',
              'Art.No. / Revision': 'cert_supp_art_no_rev',
              'Product name': 'cert_supp_prod_no',
              'Project': 'cert_supp_project',
              'Order-No.': 'cert_supp_order_no',
              'Supplier': '',
            },
            'TestInfo': {
              'Test specification': 'cert_test_spec_rev',
              'Date of Test': 'cert_date_of_test',
              'Test result': 'cert_test_result',
              'LocationDate': 'cert_location_date',
            },
          },
        },
      },
    },
    {
      id: 'error-handler',
      group: 'software',
      title: 'Error Handler',
      shortLabel: 'ErrorHandler.json',
      sourcePath: 'F:\\04_REMview_v3\\01_LabVIEWcode\\remview_v3\\REMview_v3\\Support\\modules_cfg\\ErrorHandler.json',
      summary: 'Error log target, filters and formatting support data.',
      config: {
        'FileLog Path': 'C:\\ProgramData\\HaslerRail\\RTPREMView\\04_Logs',
        'Name': 'RTPREMView_ErrorLog',
        'Code filter': {
          'to GUI': [],
          'to file': [],
        },
        'Format string': {
          'No Error': '',
          'Error': '',
        },
        'ErrorSupport': [],
      },
    },
  ],
}

export const allModuleCfgItems = [...moduleCfgItems.hardware, ...moduleCfgItems.software]

export function getModuleCfgItem(group: string, id: string) {
  return allModuleCfgItems.find(item => item.group === group && item.id === id)
}
