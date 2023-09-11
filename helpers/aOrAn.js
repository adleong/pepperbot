function aOrAn(input) {
  if (!input) return ''

  const firstChar = input[0];

  return ['a', 'e', 'i', 'o', 'u'].includes(firstChar.toLowerCase()) 
  ? 'an' 
  : 'a';
}

module.exports = { aOrAn };
