import re

with open(r'C:\Users\sj932053\AIAgents\AITutor\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Main Container & Header
content = content.replace(
    '<div className="min-h-screen bg-slate-900 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 font-sans text-slate-200">',
    '<div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 font-sans">'
)
content = content.replace(
    '<div className="bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-700 relative overflow-hidden">',
    '<div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/60 relative overflow-hidden">'
)
content = content.replace(
    '<div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>',
    '<div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400"></div>'
)
content = content.replace(
    '<div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center shrink-0 mt-1 border border-indigo-500/30">',
    '<div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0 mt-1">'
)
content = content.replace(
    '<BookOpen className="w-6 h-6 text-indigo-400" />',
    '<BookOpen className="w-6 h-6 text-indigo-600" />'
)
content = content.replace(
    '<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight line-clamp-2">{courseTitle}</h1>',
    '<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight line-clamp-2">{courseTitle}</h1>'
)

# Account Actions
content = content.replace(
    'className="text-slate-400 hover:text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-slate-700 transition-colors flex items-center"',
    'className="text-slate-500 hover:text-slate-700 text-sm font-medium px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center"'
)
content = content.replace(
    'className="text-rose-400 hover:text-rose-300 text-sm font-medium px-3 py-2 rounded-xl hover:bg-rose-500/10 transition-colors flex items-center"',
    'className="text-rose-500 hover:text-rose-700 text-sm font-medium px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors flex items-center"'
)

# Middle Row: Controls
content = content.replace(
    '<div className="flex flex-wrap items-end gap-4 p-5 bg-slate-900/50 rounded-2xl border border-slate-700 mb-8">',
    '<div className="flex flex-wrap items-end gap-4 p-5 bg-slate-50/80 rounded-2xl border border-slate-100 mb-8">'
)
content = content.replace(
    '<label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">',
    '<label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">'
)
content = content.replace(
    'className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow w-full shadow-sm"',
    'className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow w-full shadow-sm"'
)
content = content.replace(
    'className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"',
    'className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"'
)
content = content.replace(
    'className="flex-1 sm:flex-none bg-slate-800 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-sm font-semibold py-2.5 px-5 rounded-xl transition-colors flex items-center justify-center shadow-sm whitespace-nowrap"',
    'className="flex-1 sm:flex-none bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-sm font-semibold py-2.5 px-5 rounded-xl transition-colors flex items-center justify-center shadow-sm whitespace-nowrap"'
)

# Progress Bar
content = content.replace(
    '<div className="flex justify-between text-sm font-semibold text-slate-300">',
    '<div className="flex justify-between text-sm font-semibold text-slate-700">'
)
content = content.replace(
    '<span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Overall Progress</span>',
    '<span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Overall Progress</span>'
)
content = content.replace(
    '<span className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700 shadow-inner">',
    '<span className="bg-slate-50 px-3 py-1 rounded-full border border-slate-200 shadow-sm">'
)
content = content.replace(
    '<div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden shadow-inner border border-slate-800">',
    '<div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">'
)
content = content.replace(
    '<div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-700 ease-out"',
    '<div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-3 rounded-full transition-all duration-700 ease-out"'
)

# Chapter Tabs
content = content.replace(
    "? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 border-indigo-500'",
    "? 'bg-indigo-600 text-white shadow-md border-indigo-600'"
)
content = content.replace(
    ": 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700 hover:border-slate-500'",
    ": 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-indigo-200'"
)
content = content.replace(
    "className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}",
    "className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}"
)
content = content.replace(
    "className={`font-semibold text-sm sm:text-base line-clamp-2 ${isActive ? 'text-white' : 'text-slate-200'}`}",
    "className={`font-semibold text-sm sm:text-base line-clamp-2 ${isActive ? 'text-white' : 'text-slate-800'}`}"
)
content = content.replace(
    '<div className="mt-2 w-full bg-black/20 rounded-full h-1.5 overflow-hidden border border-black/10">',
    '<div className="mt-2 w-full bg-black/10 rounded-full h-1.5 overflow-hidden">'
)

# Chapter Content
content = content.replace(
    '<h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center">',
    '<h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center">'
)
content = content.replace(
    'before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent',
    'before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent'
)
content = content.replace(
    '<div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-indigo-900 text-indigo-300 shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">',
    '<div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">'
)
content = content.replace(
    '<div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-800 p-5 rounded-2xl shadow-md border border-slate-700 hover:border-slate-600 hover:-translate-y-1 transition-all duration-300">',
    '<div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">'
)
content = content.replace(
    '<h3 className="text-lg font-bold text-slate-100 leading-tight">',
    '<h3 className="text-lg font-bold text-slate-800 leading-tight">'
)
content = content.replace(
    'className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/20 transition-colors"',
    'className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-100 transition-colors"'
)
content = content.replace(
    "? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20'",
    "? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'"
)
content = content.replace(
    "? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'",
    "? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'"
)

# Modals
content = content.replace(
    '<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">',
    '<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">'
)
content = content.replace(
    '<div className="bg-slate-900 sm:rounded-3xl shadow-2xl w-full h-full sm:h-auto max-w-5xl sm:max-h-[90vh] flex flex-col relative overflow-hidden border border-slate-700">',
    '<div className="bg-white sm:rounded-3xl shadow-2xl w-full h-full sm:h-auto max-w-5xl sm:max-h-[90vh] flex flex-col relative overflow-hidden">'
)
content = content.replace(
    '<div className="bg-slate-900 sm:rounded-3xl shadow-2xl w-full h-full sm:h-auto max-w-4xl sm:max-h-[90vh] flex flex-col relative overflow-hidden border border-slate-700">',
    '<div className="bg-white sm:rounded-3xl shadow-2xl w-full h-full sm:h-auto max-w-4xl sm:max-h-[90vh] flex flex-col relative overflow-hidden">'
)
content = content.replace(
    'className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors z-10"',
    'className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10"'
)
content = content.replace(
    '<div className="p-6 sm:p-8 border-b border-slate-800 bg-slate-800/50">',
    '<div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">'
)
content = content.replace(
    '<h2 className="text-2xl font-bold text-white pr-12">',
    '<h2 className="text-2xl font-bold text-slate-900 pr-12">'
)
content = content.replace(
    '<h2 className="text-2xl font-bold text-white flex items-center">',
    '<h2 className="text-2xl font-bold text-slate-900 flex items-center">'
)
content = content.replace(
    '<Pencil className="w-6 h-6 mr-3 text-rose-400" />',
    '<Pencil className="w-6 h-6 mr-3 text-rose-500" />'
)
content = content.replace(
    '<div className="p-6 sm:p-8 overflow-y-auto flex-grow space-y-8 bg-slate-900/50">',
    '<div className="p-6 sm:p-8 overflow-y-auto flex-grow space-y-8 bg-slate-50/30">'
)
content = content.replace(
    '<div className="flex flex-col items-center justify-center py-16 text-slate-400">',
    '<div className="flex flex-col items-center justify-center py-16 text-slate-500">'
)
content = content.replace(
    '<Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />',
    '<Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />'
)
content = content.replace(
    '<Loader2 className="w-10 h-10 animate-spin mb-4 text-rose-500" />',
    '<Loader2 className="w-10 h-10 animate-spin mb-4 text-rose-500" />' # already rose-500
)

# Modal Content (Paragraphs, Summary, etc.)
content = content.replace(
    '<p key={flowIdx} className="text-slate-300 text-lg leading-relaxed">',
    '<p key={flowIdx} className="text-slate-800 text-lg leading-relaxed">'
)
content = content.replace(
    '<div key={flowIdx} className="bg-amber-900/20 border-l-4 border-amber-500 p-5 rounded-r-xl text-slate-200 shadow-sm">',
    '<div key={flowIdx} className="bg-amber-50 border-l-4 border-amber-400 p-5 rounded-r-xl text-slate-800 shadow-sm">'
)
content = content.replace(
    '<div key={flowIdx} className="bg-slate-800 p-5 rounded-xl text-center text-slate-400 border border-slate-700 border-dashed">',
    '<div key={flowIdx} className="bg-slate-100 p-5 rounded-xl text-center text-slate-500 border border-slate-200 border-dashed">'
)
content = content.replace(
    '<div key={flowIdx} className="space-y-4 bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-lg my-10">',
    '<div key={flowIdx} className="space-y-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm my-10">'
)
content = content.replace(
    '<p className="font-medium text-slate-200 text-lg leading-relaxed">',
    '<p className="font-medium text-slate-800 text-lg leading-relaxed">'
)
content = content.replace(
    '<span className="text-indigo-400 font-bold mr-3 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">',
    '<span className="text-indigo-600 font-bold mr-3 bg-indigo-50 px-2 py-1 rounded-lg">'
)
content = content.replace(
    '<span className="text-rose-400 font-bold mr-3 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">',
    '<span className="text-rose-600 font-bold mr-3 bg-rose-50 px-2 py-1 rounded-lg">'
)
content = content.replace(
    'className="flex-shrink-0 ml-4 text-sm font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors border border-indigo-500/20"',
    'className="flex-shrink-0 ml-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"'
)
content = content.replace(
    'className="flex-shrink-0 ml-4 text-sm font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg transition-colors border border-rose-500/20"',
    'className="flex-shrink-0 ml-4 text-sm font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"'
)
content = content.replace(
    '<div className="p-5 bg-indigo-900/20 rounded-xl border border-indigo-500/30 text-sm text-slate-300 mb-6">',
    '<div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-sm text-slate-800 mb-6">'
)
content = content.replace(
    '<div className="p-5 bg-rose-900/20 rounded-xl border border-rose-500/30 text-sm text-slate-300 mb-6">',
    '<div className="p-5 bg-rose-50/50 rounded-xl border border-rose-100 text-sm text-slate-800 mb-6">'
)
content = content.replace(
    '<h4 className="font-bold text-indigo-400 mb-3 flex items-center">',
    '<h4 className="font-bold text-indigo-800 mb-3 flex items-center">'
)
content = content.replace(
    '<h4 className="font-bold text-rose-400 mb-3 flex items-center">',
    '<h4 className="font-bold text-rose-800 mb-3 flex items-center">'
)
content = content.replace(
    '<div className="bg-slate-900 p-4 rounded-lg shadow-inner border border-slate-800">',
    '<div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">'
)

# Modal Options & Textarea
content = content.replace(
    'className="flex items-center space-x-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 cursor-pointer hover:bg-indigo-900/20 hover:border-indigo-500/30 transition-all"',
    'className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all"'
)
content = content.replace(
    'className="flex items-center space-x-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 cursor-pointer hover:bg-rose-900/20 hover:border-rose-500/30 transition-all"',
    'className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-rose-50 hover:border-rose-200 transition-all"'
)
content = content.replace(
    'className="w-5 h-5 text-indigo-500 bg-slate-800 border-slate-600 focus:ring-indigo-500 disabled:opacity-50"',
    'className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 disabled:opacity-50"'
)
content = content.replace(
    'className="w-5 h-5 text-rose-500 bg-slate-800 border-slate-600 focus:ring-rose-500 disabled:opacity-50"',
    'className="w-5 h-5 text-rose-600 border-slate-300 focus:ring-rose-500 disabled:opacity-50"'
)
content = content.replace(
    '<span className="text-slate-300 font-medium">',
    '<span className="text-slate-700 font-medium">'
)
content = content.replace(
    'className="w-full p-4 border border-slate-700 bg-slate-900/50 text-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-800 disabled:text-slate-500 transition-shadow"',
    'className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition-shadow"'
)
content = content.replace(
    'className="w-full p-4 border border-slate-700 bg-slate-900/50 text-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none disabled:bg-slate-800 disabled:text-slate-500 transition-shadow"',
    'className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition-shadow"'
)
content = content.replace(
    'className="cursor-pointer flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-300 rounded-lg transition-colors border border-slate-700"',
    'className="cursor-pointer flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 rounded-lg transition-colors"'
)
content = content.replace(
    '<ImageIcon className="w-4 h-4 mr-2 text-slate-400" />',
    '<ImageIcon className="w-4 h-4 mr-2 text-slate-500" />'
)
content = content.replace(
    'className="h-20 rounded-lg border border-slate-700 shadow-sm"',
    'className="h-20 rounded-lg border border-slate-200 shadow-sm"'
)

# Modal Evaluation
content = content.replace(
    "? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'",
    "? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'"
)
content = content.replace(
    "? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-indigo-900/20 border-indigo-500/30'",
    "? 'bg-emerald-50/50 border-emerald-100' : 'bg-indigo-50/50 border-indigo-100'"
)
content = content.replace(
    "? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-rose-900/20 border-rose-500/30'",
    "? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'"
)
content = content.replace(
    "? 'text-emerald-400' : 'text-indigo-400'",
    "? 'text-emerald-800' : 'text-indigo-800'"
)
content = content.replace(
    "? 'text-emerald-400' : 'text-rose-400'",
    "? 'text-emerald-800' : 'text-rose-800'"
)

# Modal Submit Button
content = content.replace(
    'className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"',
    'className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"'
)
content = content.replace(
    'className="bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"',
    'className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"'
)
content = content.replace(
    '<div className="mt-6 border-t border-slate-700 pt-4">',
    '<div className="mt-6 border-t border-slate-100 pt-4">'
)

# Modal Pagination & Footer
content = content.replace(
    'let bgColor = "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700";',
    'let bgColor = "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200";'
)
content = content.replace(
    'if (idx === classCurrentIndex) bgColor = "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 border-indigo-500 ring-2 ring-indigo-500/30";',
    'if (idx === classCurrentIndex) bgColor = "bg-indigo-600 text-white shadow-md ring-4 ring-indigo-100 border-indigo-600";'
)
content = content.replace(
    'if (idx === homeworkCurrentIndex) bgColor = "bg-rose-600 text-white shadow-lg shadow-rose-900/50 border-rose-500 ring-2 ring-rose-500/30";',
    'if (idx === homeworkCurrentIndex) bgColor = "bg-rose-500 text-white shadow-md ring-4 ring-rose-100 border-rose-500";'
)
content = content.replace(
    'else if (classEvaluation[idx]?.correct) bgColor = "bg-emerald-600 text-white border-emerald-500 shadow-sm";',
    'else if (classEvaluation[idx]?.correct) bgColor = "bg-emerald-500 text-white border-emerald-500 shadow-sm";'
)
content = content.replace(
    'else if (homeworkEvaluations[idx]?.correct) bgColor = "bg-emerald-600 text-white border-emerald-500 shadow-sm";',
    'else if (homeworkEvaluations[idx]?.correct) bgColor = "bg-emerald-500 text-white border-emerald-500 shadow-sm";'
)
content = content.replace(
    'else if (classEvaluation[idx] && !classEvaluation[idx].correct) bgColor = "bg-rose-600 text-white border-rose-500 shadow-sm";',
    'else if (classEvaluation[idx] && !classEvaluation[idx].correct) bgColor = "bg-rose-500 text-white border-rose-500 shadow-sm";'
)
content = content.replace(
    'else if (homeworkEvaluations[idx] && !homeworkEvaluations[idx].correct) bgColor = "bg-rose-600 text-white border-rose-500 shadow-sm";',
    'else if (homeworkEvaluations[idx] && !homeworkEvaluations[idx].correct) bgColor = "bg-rose-500 text-white border-rose-500 shadow-sm";'
)
content = content.replace(
    'else if (classAnswers[idx] || classImages[idx]) bgColor = "bg-indigo-500/50 text-white border-indigo-500/50 shadow-sm";',
    'else if (classAnswers[idx] || classImages[idx]) bgColor = "bg-indigo-300 text-white border-indigo-300 shadow-sm";'
)
content = content.replace(
    'else if (homeworkAnswers[idx] || homeworkImages[idx]) bgColor = "bg-rose-500/50 text-white border-rose-500/50 shadow-sm";',
    'else if (homeworkAnswers[idx] || homeworkImages[idx]) bgColor = "bg-rose-300 text-white border-rose-300 shadow-sm";'
)

content = content.replace(
    '<div key={idx} className="space-y-4 bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-lg">',
    '<div key={idx} className="space-y-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">'
)

content = content.replace(
    '<div className="p-5 sm:p-8 border-t border-slate-800 bg-slate-800/80 sm:rounded-b-3xl flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mt-auto">',
    '<div className="p-5 sm:p-8 border-t border-slate-100 bg-slate-50/80 sm:rounded-b-3xl flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mt-auto">'
)
content = content.replace(
    '<div className="text-sm font-medium text-slate-400 order-2 sm:order-1 bg-slate-900 px-4 py-2 rounded-xl border border-slate-700 shadow-inner">',
    '<div className="text-sm font-medium text-slate-500 order-2 sm:order-1 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">'
)
content = content.replace(
    'className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 sm:py-2.5 px-5 rounded-xl border border-slate-600 shadow-sm transition-all"',
    'className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 sm:py-2.5 px-5 rounded-xl border border-slate-200 shadow-sm transition-all"'
)
content = content.replace(
    'className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 sm:py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center w-full sm:w-auto"',
    'className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 sm:py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center w-full sm:w-auto"'
)
content = content.replace(
    'className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 sm:py-2.5 px-6 rounded-xl transition-all flex items-center justify-center w-full sm:w-auto border border-slate-600"',
    'className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-3 sm:py-2.5 px-6 rounded-xl transition-all flex items-center justify-center w-full sm:w-auto"'
)

# Auth Screen
content = content.replace(
    '<div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-200">',
    '<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">'
)
content = content.replace(
    '<div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center shadow-lg border border-indigo-500/30">',
    '<div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-sm">'
)
content = content.replace(
    '<BookOpen className="w-8 h-8 text-indigo-400" />',
    '<BookOpen className="w-8 h-8 text-indigo-600" />'
)
content = content.replace(
    '<h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">',
    '<h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">'
)
content = content.replace(
    '<div className="bg-slate-900/80 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-slate-800">',
    '<div className="bg-white/80 backdrop-blur-xl py-8 px-4 shadow-xl sm:rounded-3xl sm:px-10 border border-slate-200/60">'
)
content = content.replace(
    '<label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">',
    '<label className="block text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">'
)
content = content.replace(
    "? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'",
    "? 'border-indigo-600 bg-indigo-50 text-indigo-700'"
)
content = content.replace(
    ": 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:border-slate-600'",
    ": 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'"
)
content = content.replace(
    '<label htmlFor="email" className="block text-sm font-medium text-slate-300">',
    '<label htmlFor="email" className="block text-sm font-medium text-slate-700">'
)
content = content.replace(
    '<label htmlFor="password" className="block text-sm font-medium text-slate-300">',
    '<label htmlFor="password" className="block text-sm font-medium text-slate-700">'
)
content = content.replace(
    '<label htmlFor="parentEmail" className="block text-sm font-medium text-slate-300">',
    '<label htmlFor="parentEmail" className="block text-sm font-medium text-slate-700">'
)
content = content.replace(
    '<label htmlFor="code" className="block text-sm font-medium text-slate-300">',
    '<label htmlFor="code" className="block text-sm font-medium text-slate-700">'
)
content = content.replace(
    'className="appearance-none block w-full px-4 py-3 border border-slate-700 rounded-xl shadow-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-800 text-white transition-shadow"',
    'className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white transition-shadow"'
)
content = content.replace(
    '<div className="text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">',
    '<div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-lg border border-rose-100">'
)
content = content.replace(
    'className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:opacity-50 transition-all"',
    'className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"'
)
content = content.replace(
    '<p className="text-slate-400">',
    '<p className="text-gray-600">'
)
content = content.replace(
    'className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline"',
    'className="text-blue-600 hover:underline"'
)

# Iconboxes MathText
content = content.replace(
    "let bgColor = 'bg-slate-800';",
    "let bgColor = 'bg-[#f4fafa]';"
)
content = content.replace(
    "let borderColor = 'border-slate-600';",
    "let borderColor = 'border-[#75baba]';"
)
content = content.replace(
    "let textColor = 'text-slate-300';",
    "let textColor = 'text-[#19335c]';"
)
content = content.replace(
    "let iconColor = 'text-slate-400';",
    "let iconColor = 'text-[#19335c]';"
)
content = content.replace(
    '<div key={ibIdx} className={`flex flex-col border rounded-xl ${borderColor} ${bgColor} my-4`}>',
    '<div key={ibIdx} className={`flex flex-col border ${borderColor} ${bgColor} my-4`}>'
)
content = content.replace(
    '<div className="text-slate-200 py-4 pr-4 w-full">',
    '<div className="text-gray-800 py-4 pr-4 w-full">'
)
content = content.replace(
    '<div className="text-slate-200 py-0 pr-4 w-full">',
    '<div className="text-gray-800 py-0 pr-4 w-full">'
)
content = content.replace(
    'className="my-4 max-w-full h-auto rounded shadow-sm border border-slate-700 block mx-auto bg-slate-200 p-2"',
    'className="my-4 max-w-full h-auto rounded shadow-sm border border-gray-200 block mx-auto bg-white p-2"'
)
content = content.replace(
    '<span className="text-rose-500 font-mono text-sm">{part}</span>',
    '<span className="text-red-500 font-mono text-sm">{part}</span>'
)

with open(r'C:\Users\sj932053\AIAgents\AITutor\frontend\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

