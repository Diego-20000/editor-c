#include <stdio.h>
int main(void){
  long long f = 1;
  int i;
  for (i = 1; i <= 25; i++) {
    f = f * i;
    if (i >= 20) printf("%d! = %lld\n", i, f);
  }
  return 0;
}
