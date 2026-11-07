#include <stdio.h>
int f(int x){ int y = x * 2; }
int main(void){
  printf("%d\n", f(4));
  return 0;
}
