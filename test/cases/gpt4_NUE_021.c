#include <stdio.h>
int MEDIR(int VALOR);
int main() {
 printf("Medicion: %d\n", MEDIR(3));
}
int MEDIR(int VALOR) {
 return VALOR * 2;
}
