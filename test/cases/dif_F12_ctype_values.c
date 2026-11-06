#include <stdio.h>
#include <ctype.h>
int main(void){
  printf("%d %d %d %d %d\n", isdigit('5'), isalpha('a'), isupper('A'), islower('a'), isspace(' '));
  printf("%d\n", isalnum('z'));
  return 0;
}
